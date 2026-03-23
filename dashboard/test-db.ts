import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { executeDatabricksQuery } from './src/lib/databricks';

async function main() {
    const keyword = 'billing';
    const sql = `
        SELECT id, source.body AS initial_message
        FROM intercom.bronze.intercom_conversations
        WHERE state = 'closed'
          AND (LOWER(source.body) LIKE '%${keyword}%' OR LOWER(CAST(conversation_parts AS STRING)) LIKE '%${keyword}%')
        LIMIT 1
    `;
    const rows = await executeDatabricksQuery(sql);
    console.log('Result:', rows);
}
main().catch(console.error);
