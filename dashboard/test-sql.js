require('dotenv').config({ path: '.env.local' });
const { DBSQLClient } = require('@databricks/sql');

async function testSQL() {
    const HOST = process.env.DATABRICKS_HOST;
    const PATH = process.env.DATABRICKS_HTTP_PATH;
    const TOKEN = process.env.DATABRICKS_TOKEN;

    const client = new DBSQLClient();
    try {
        await client.connect({ host: HOST, path: PATH, token: TOKEN });
        const session = await client.openSession();
        
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
              AND updated_at >= 1712000000
        )
        WHERE 1=1 
        GROUP BY week_start
        ORDER BY week_start
        `;
        
        console.log('Executing query...');
        const operation = await session.executeStatement(sql, { runAsync: true, maxRows: 10000 });
        const result = await operation.fetchAll();
        console.log('Success:', result.length, 'rows');
        await operation.close();
        await session.close();
        await client.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
testSQL();
