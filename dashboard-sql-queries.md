# Dashboard SQL Queries
> Source: `dashboard/src/lib/databricks.ts`  
> All queries run against: `intercom.bronze.intercom_conversations`  
> Timestamps are Unix epoch (seconds). Team filtering is optional, injected at runtime.

---

## 1. Core Team Stats

**Function:** `getDatabricksStats`  
**Used for:** KPI tiles — team/personal solves, CSAT averages, week-over-week deltas.

```sql
WITH base_conversations AS (
    SELECT 
        id,
        team_assignee_id,
        admin_assignee_id,
        state,
        updated_at,
        created_at,
        custom_attributes.Brand            AS custom_brand,
        conversation_rating.rating         AS csat_rating,
        statistics.last_closed_by_id       AS closed_by_id,
        statistics.first_admin_reply_at    AS first_reply_at
    FROM intercom.bronze.intercom_conversations
    WHERE updated_at >= :startOfPrevWeekTs
),

filtered_team_convs AS (
    SELECT * FROM base_conversations
    WHERE team_assignee_id IN (:teamIds)  -- omitted when no team filter
)

SELECT 
    -- Month Counts
    COUNT(CASE WHEN state = 'closed' AND updated_at >= :startOfMonthTs THEN id END)                                                           AS team_month_solves,
    -- Week Counts
    COUNT(CASE WHEN state = 'closed' AND updated_at >= :startOfWeekTs THEN id END)                                                            AS team_week_solves,
    -- Prev Week Counts
    COUNT(CASE WHEN state = 'closed' AND updated_at >= :startOfPrevWeekTs AND updated_at < :startOfWeekTs THEN id END)                        AS team_prev_week_solves,

    -- Personal Counts
    COUNT(CASE WHEN state = 'closed' AND closed_by_id = ':myAdminId' AND updated_at >= :startOfMonthTs THEN id END)                           AS personal_month_solves,
    COUNT(CASE WHEN state = 'closed' AND closed_by_id = ':myAdminId' AND updated_at >= :startOfWeekTs THEN id END)                            AS personal_week_solves,

    -- Month CSAT
    AVG(CASE WHEN csat_rating IS NOT NULL AND updated_at >= :startOfMonthTs THEN csat_rating END)                                              AS csat_month_avg,
    COUNT(CASE WHEN csat_rating IS NOT NULL AND updated_at >= :startOfMonthTs THEN id END)                                                     AS csat_month_count,

    -- Week CSAT
    AVG(CASE WHEN csat_rating IS NOT NULL AND updated_at >= :startOfWeekTs THEN csat_rating END)                                               AS csat_week_avg,
    COUNT(CASE WHEN csat_rating IS NOT NULL AND updated_at >= :startOfWeekTs THEN id END)                                                      AS csat_week_count,

    -- Prev Week CSAT
    AVG(CASE WHEN csat_rating IS NOT NULL AND updated_at >= :startOfPrevWeekTs AND updated_at < :startOfWeekTs THEN csat_rating END)           AS csat_prev_week_avg,
    COUNT(CASE WHEN csat_rating IS NOT NULL AND updated_at >= :startOfPrevWeekTs AND updated_at < :startOfWeekTs THEN id END)                  AS csat_prev_week_count

FROM filtered_team_convs;
```

---

## 2. Weekly Volume + AI Sentiment

**Function:** `getWeeklyVolumeWithSentiment`  
**Used for:** Bar chart with per-week sentiment breakdown on hover.  
**AI Function:** `ai_analyze_sentiment()` — classifies each CSAT remark as `positive`, `neutral`, or `negative`.

```sql
SELECT 
    DATE_TRUNC('WEEK', from_unixtime(updated_at)) AS week_start,
    COUNT(*)                                        AS total_count,
    COUNT(sentiment)                                AS rated_count,
    COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) AS positive_count,
    COUNT(CASE WHEN sentiment = 'neutral'  THEN 1 END) AS neutral_count,
    COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) AS negative_count
FROM (
    SELECT 
        updated_at,
        team_assignee_id,
        CASE 
            WHEN conversation_rating.remark IS NOT NULL
             AND TRIM(conversation_rating.remark) != ''
            THEN ai_analyze_sentiment(conversation_rating.remark)
            ELSE NULL
        END AS sentiment
    FROM intercom.bronze.intercom_conversations
    WHERE state = 'closed'
      AND updated_at >= :lookbackTs   -- default: 8 weeks ago
)
WHERE 1=1
  AND team_assignee_id IN (:teamIds)  -- omitted when no team filter
GROUP BY week_start
ORDER BY week_start;
```

---

## 3. Daily Drilldown (per week)

**Function:** `getWeeklyDrilldownStats`  
**Used for:** Liquid Glass modal — day-by-day closed conversation counts for a clicked week.

```sql
SELECT 
    DATE_TRUNC('DAY', from_unixtime(updated_at)) AS day_start,
    COUNT(*)                                       AS closed_count
FROM intercom.bronze.intercom_conversations
WHERE state = 'closed'
  AND updated_at >= :weekStartTs
  AND updated_at  < :weekEndTs     -- weekStartTs + 7 days
  AND team_assignee_id IN (:teamIds)  -- omitted when no team filter
GROUP BY day_start
ORDER BY day_start;
```

---

## 4. Churn Risk Radar

**Function:** `getChurnRiskAccounts`  
**Used for:** Churn Risk card — top 10 at-risk accounts from the past 30 days.  
**AI Functions:**  
- `ai_analyze_sentiment()` — filters to only negative conversations  
- `ai_classify()` — tags the root-cause churn driver

```sql
SELECT 
    id,
    source.author.email            AS customer_email,
    source.author.name             AS customer_name,
    conversation_rating.remark     AS review,
    updated_at,
    ai_classify(
        conversation_rating.remark,
        ARRAY('technical bugs', 'pricing', 'onboarding', 'other')
    )                              AS churn_driver
FROM intercom.bronze.intercom_conversations
WHERE state = 'closed'
  AND updated_at >= :lookbackTs   -- 30 days ago
  AND conversation_rating.remark IS NOT NULL
  AND ai_analyze_sentiment(conversation_rating.remark) = 'negative'
  AND team_assignee_id IN (:teamIds)  -- omitted when no team filter
ORDER BY updated_at DESC
LIMIT 10;
```

---

## Notes

| Parameter | Description |
|---|---|
| `:startOfMonthTs` | Unix timestamp for the 1st of the current month (UTC) |
| `:startOfWeekTs` | Unix timestamp for the start of the current week (UTC Sunday) |
| `:startOfPrevWeekTs` | Unix timestamp for the start of the previous week |
| `:lookbackTs` | Variable lookback — 8 weeks for volume chart, 30 days for churn |
| `:weekStartTs` | Unix timestamp of the specific week being drilled into |
| `:myAdminId` | Intercom admin ID of the currently logged-in user |
| `:teamIds` | Comma-separated list of Intercom team IDs for the selected tier |
