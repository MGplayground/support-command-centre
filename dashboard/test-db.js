require('dotenv').config({ path: '.env.local' });
const { DBSQLClient } = require('@databricks/sql');

async function testConnection() {
    const HOST = process.env.DATABRICKS_HOST;
    const PATH = process.env.DATABRICKS_HTTP_PATH;
    const TOKEN = process.env.DATABRICKS_TOKEN;

    console.log('Testing Databricks connection...');
    const client = new DBSQLClient();

    try {
        await client.connect({ host: HOST, path: PATH, token: TOKEN });
        console.log('Connected!');
        const session = await client.openSession();
        console.log('Session opened!');
        const operation = await session.executeStatement('SELECT 1', { runAsync: true, maxRows: 1 });
        const result = await operation.fetchAll();
        console.log('Query successful:', result);
        await operation.close();
        await session.close();
        await client.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
testConnection();
