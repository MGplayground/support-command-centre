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
            COUNT(*) AS total_count
        FROM intercom.bronze.intercom_conversations
        WHERE state = 'closed'
          AND updated_at >= 1712000000
        GROUP BY week_start
        ORDER BY week_start
        `;
        
        console.log('Executing FAST query...');
        const operation = await session.executeStatement(sql, { runAsync: true, maxRows: 10000 });
        const result = await operation.fetchAll();
        console.log('Success:', result);
        await operation.close();
        await session.close();
        await client.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
testSQL();
