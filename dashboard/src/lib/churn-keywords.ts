/**
 * Churn Keyword Helper
 *
 * Extracted from the Databricks SQL query logic so it can be unit-tested
 * without requiring a database connection.
 *
 * Mirrors the LIKE conditions in `getChurnRiskAccounts` in databricks.ts.
 */

const HIGH_CHURN_KEYWORDS = [
    'cancel',
    'refund',
    'frustrat',
    'unacceptable',
];

/**
 * Returns true if the provided remark contains any high-risk churn keyword.
 * Case-insensitive, mirrors the SQL LOWER(remark) LIKE '%keyword%' logic.
 */
export function isHighChurnRisk(remark: string): boolean {
    const lower = remark.toLowerCase();
    return HIGH_CHURN_KEYWORDS.some(keyword => lower.includes(keyword));
}

export { HIGH_CHURN_KEYWORDS };
