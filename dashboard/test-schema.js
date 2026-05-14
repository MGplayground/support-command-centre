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
        
        const sql = `SELECT conversation_rating FROM intercom.bronze.intercom_conversations WHERE conversation_rating IS NOT NULL LIMIT 1`;
        
        const operation = await session.executeStatement(sql, { runAsync: true, maxRows: 1 });
        const result = await operation.fetchAll();
        console.log('Success:', JSON.stringify(result, null, 2));
        await operation.close();
        await session.close();
        await client.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
testSQL();
