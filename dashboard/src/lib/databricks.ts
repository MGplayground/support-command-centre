import { DBSQLClient } from '@databricks/sql';

export async function executeDatabricksQuery(sql: string) {
    const HOST = process.env.DATABRICKS_HOST;
    const PATH = process.env.DATABRICKS_HTTP_PATH;
    const TOKEN = process.env.DATABRICKS_TOKEN;

    if (!HOST || !PATH || !TOKEN) {
        throw new Error('Databricks configuration is missing. Ensure DATABRICKS_HOST, DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN are set in .env.local');
    }

    // Create a NEW client per query to avoid shared-state conflicts when executing in parallel
    const client = new DBSQLClient();

    // Fail-safe timeout to prevent infinite hanging when Databricks connection pool is maxed out
    const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        let timer: NodeJS.Timeout;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Databricks ${label} timed out after ${ms}ms`)), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    };

    try {
        // 1. Connection Phase (Allow 30s for Serverless Cold Starts)
        await withTimeout(client.connect({
            host: HOST,
            path: PATH,
            token: TOKEN,
        }), 30000, 'Connection');

        const session = await withTimeout(client.openSession(), 20000, 'OpenSession');

        console.log(`[Databricks] Executing query...`);
        const startTime = Date.now();

        // 2. Execution & Fetch Phase (Allow up to 300s for heavy concurrent AI tasks)
        const queryOperation = await withTimeout(
            session.executeStatement(sql, { runAsync: true, maxRows: 10000 }),
            300000, 'ExecuteStatement'
        );

        const result = await withTimeout(queryOperation.fetchAll(), 300000, 'FetchAll');

        await queryOperation.close();

        console.log(`[Databricks] Query complete in ${Date.now() - startTime}ms`);
        await session.close();
        await client.close();

        return result;
    } catch (error) {
        console.error('[Databricks Error]', error);
        // Best-effort cleanup
        try { await client.close(); } catch (_) { }
        throw error;
    }
}

export async function getDatabricksStats(
    teamIds: string[] | null,
    startOfMonthTs: number,
    startOfWeekTs: number,
    startOfPrevWeekTs: number,
    myAdminId: string
) {
    const teamFilter = teamIds && teamIds.length > 0
        ? `WHERE team_assignee_id IN (${teamIds.map(id => `'${id}'`).join(', ')})`
        : ``;

    // Use the earliest required timestamp as the base filter so that month-level
    // aggregations aren't silently truncated when startOfMonthTs < startOfPrevWeekTs
    // (e.g. early in the week when last-Monday is after the 1st of the month).
    const baseTs = Math.min(startOfPrevWeekTs, startOfMonthTs);

    const sql = `
        WITH base_conversations AS (
            SELECT
                id,
                team_assignee_id,
                admin_assignee_id,
                state,
                updated_at,
                created_at,
                custom_attributes.Brand AS custom_brand,
                conversation_rating.rating AS csat_rating,
                statistics.last_closed_by_id AS closed_by_id,
                statistics.first_admin_reply_at AS first_reply_at
            FROM intercom.bronze.intercom_conversations
            WHERE updated_at >= ${baseTs}
        ),
        
        filtered_team_convs AS (
            SELECT * FROM base_conversations
            ${teamFilter}
        )
        
        SELECT 
            -- Month Counts
            COUNT(CASE WHEN state = 'closed' AND updated_at >= ${startOfMonthTs} THEN id END) AS team_month_solves,
            -- Week Counts
            COUNT(CASE WHEN state = 'closed' AND updated_at >= ${startOfWeekTs} THEN id END) AS team_week_solves,
            -- Prev Week Counts
            COUNT(CASE WHEN state = 'closed' AND updated_at >= ${startOfPrevWeekTs} AND updated_at < ${startOfWeekTs} THEN id END) AS team_prev_week_solves,
            
            -- Personal Counts
            COUNT(CASE WHEN state = 'closed' AND closed_by_id = '${myAdminId}' AND updated_at >= ${startOfMonthTs} THEN id END) AS personal_month_solves,
            COUNT(CASE WHEN state = 'closed' AND closed_by_id = '${myAdminId}' AND updated_at >= ${startOfWeekTs} THEN id END) AS personal_week_solves,
            
            -- Month CSAT
            AVG(CASE WHEN csat_rating IS NOT NULL AND updated_at >= ${startOfMonthTs} THEN csat_rating END) AS csat_month_avg,
            COUNT(CASE WHEN csat_rating IS NOT NULL AND updated_at >= ${startOfMonthTs} THEN id END) AS csat_month_count,
            
            -- Week CSAT
            AVG(CASE WHEN csat_rating IS NOT NULL AND updated_at >= ${startOfWeekTs} THEN csat_rating END) AS csat_week_avg,
            COUNT(CASE WHEN csat_rating IS NOT NULL AND updated_at >= ${startOfWeekTs} THEN id END) AS csat_week_count,
            
            -- Prev Week CSAT
            AVG(CASE WHEN csat_rating IS NOT NULL AND updated_at >= ${startOfPrevWeekTs} AND updated_at < ${startOfWeekTs} THEN csat_rating END) AS csat_prev_week_avg,
            COUNT(CASE WHEN csat_rating IS NOT NULL AND updated_at >= ${startOfPrevWeekTs} AND updated_at < ${startOfWeekTs} THEN id END) AS csat_prev_week_count
            
        FROM filtered_team_convs;
    `;

    const rows = await executeDatabricksQuery(sql);
    return rows[0];
}

/**
 * Get total conversation counts broken down by week for the high-level chart.
 * Uses Databricks AI to analyze sentiment on customer remarks.
 */
export async function getWeeklyVolumeWithSentiment(
    teamIds: string[] | null,
    weeksBack: number = 8
) {
    const now = new Date();
    // Default lookback to 8 weeks ago
    const startOfCurrentWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()));
    const lookbackTs = Math.floor(startOfCurrentWeek.getTime() / 1000) - (weeksBack * 7 * 24 * 60 * 60);

    const teamFilter = teamIds && teamIds.length > 0
        ? `AND team_assignee_id IN (${teamIds.map(id => `'${id}'`).join(', ')})`
        : ``;

    const sql = `
        SELECT 
            DATE_TRUNC('WEEK', from_unixtime(updated_at)) AS week_start,
            COUNT(*) AS total_count,
            COUNT(sentiment) AS rated_count,
            COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) AS positive_count,
            COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) AS neutral_count,
            COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) AS negative_count
        FROM (
            SELECT 
                updated_at,
                team_assignee_id,
                CASE 
                    WHEN conversation_rating.remark IS NOT NULL AND TRIM(conversation_rating.remark) != ''
                    THEN ai_analyze_sentiment(conversation_rating.remark)
                    ELSE NULL
                END as sentiment
            FROM intercom.bronze.intercom_conversations
            WHERE state = 'closed'
              AND updated_at >= ${lookbackTs}
        )
        WHERE 1=1 ${teamFilter}
        GROUP BY week_start
        ORDER BY week_start
    `;

    return await executeDatabricksQuery(sql);
}

/**
 * Get daily conversation counts for a specific week (drill-down).
 */
export async function getWeeklyDrilldownStats(
    teamIds: string[] | null,
    weekStartTs: number
) {
    // We want data for the selected week, AND the 3 weeks prior
    const weekEndTs = weekStartTs + (7 * 24 * 60 * 60);
    const fourWeeksPriorTs = weekStartTs - (21 * 24 * 60 * 60);

    const teamFilter = teamIds && teamIds.length > 0
        ? `AND team_assignee_id IN (${teamIds.map(id => `'${id}'`).join(', ')})`
        : ``;

    const sql = `
        SELECT 
            DATE_TRUNC('DAY', from_unixtime(updated_at)) AS day_start,
            COUNT(*) AS closed_count
        FROM intercom.bronze.intercom_conversations
        WHERE state = 'closed'
          AND updated_at >= ${fourWeeksPriorTs}
          AND updated_at < ${weekEndTs}
          ${teamFilter}
        GROUP BY day_start
        ORDER BY day_start
    `;

    return await executeDatabricksQuery(sql);
}

/**
 * Get Churn Risk Accounts using Databricks AI to classify negative reviews.
 * Searches recent conversations for negative sentiment and maps them to churn drivers.
 */
export async function getChurnRiskAccounts(
    teamIds: string[] | null,
    limit: number = 10
) {
    const lookbackTs = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // Past 30 days

    const sql = `
        SELECT 
            id,
            source.author.email AS customer_email,
            source.author.name AS customer_name,
            conversation_rating.remark AS review,
            updated_at,
            ai_classify(conversation_rating.remark, ARRAY('technical bugs', 'pricing', 'onboarding', 'other')) AS churn_driver
        FROM intercom.bronze.intercom_conversations
        WHERE state = 'closed'
          AND updated_at >= ${lookbackTs}
          AND conversation_rating.remark IS NOT NULL
          AND (
              ai_analyze_sentiment(conversation_rating.remark) = 'negative'
              OR LOWER(conversation_rating.remark) LIKE '%cancel%'
              OR LOWER(conversation_rating.remark) LIKE '%frustrat%'
              OR LOWER(conversation_rating.remark) LIKE '%refund%'
              OR LOWER(conversation_rating.remark) LIKE '%unacceptable%'
          )
        ORDER BY updated_at DESC
        LIMIT ${limit}
        /* CACHE_BUST: ${Math.floor(Date.now() / (3600000))} */
    `;

    console.log("[Databricks] Churn Risk SQL:", sql);

    return await executeDatabricksQuery(sql);
}


/**
 * Perform a keyword search on historical closed conversations.
 * Used by the AI Assistant to find past solutions.
 */
export async function searchHistoricalConversations(keyword: string, limit: number = 3) {
    const safeKeyword = keyword.replace(/'/g, "''").toLowerCase();
    
    // Search the initial message body or the subsequent conversation parts within a 30-day window
    const lookbackTs = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); 
    
    const sql = `
        SELECT 
            id,
            source.author.name AS customer_name,
            source.body AS initial_message,
            conversation_parts,
            updated_at
        FROM intercom.bronze.intercom_conversations
        WHERE state = 'closed'
          AND updated_at >= ${lookbackTs}
          AND (LOWER(source.body) LIKE '%${safeKeyword}%' OR LOWER(CAST(conversation_parts AS STRING)) LIKE '%${safeKeyword}%')
        ORDER BY updated_at DESC
        LIMIT ${limit}
    `;
    
    return await executeDatabricksQuery(sql);
}

/**
 * Get a breakdown of the most common issues among all recent closed tickets.
 * Uses Databricks AI to classify the conversation topics.
 */
export async function getCommonIssuesBreakdown(limit: number = 5) {
    const lookbackTs = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // Past 30 days

    // Classify the initial message body into themes from a sample of recent tickets to ensure speed
    const sql = `
        SELECT 
            ai_classify(body, ARRAY('technical bug', 'billing/pricing', 'onboarding', 'feature request', 'how-to', 'other')) AS issue_theme,
            COUNT(*) as frequency,
            MAX(body) as example_ticket
        FROM (
            SELECT LEFT(source.body, 1000) as body
            FROM intercom.bronze.intercom_conversations
            WHERE state = 'closed'
              AND updated_at >= ${lookbackTs}
              AND source.body IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 100
        )
        GROUP BY issue_theme
        ORDER BY frequency DESC
        LIMIT ${limit}
        /* CACHE_BUST: ${Math.floor(Date.now() / (3600000))} */
    `;

    return await executeDatabricksQuery(sql);
}
