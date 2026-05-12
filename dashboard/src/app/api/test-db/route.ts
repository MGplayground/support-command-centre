import { NextResponse } from 'next/server';
import { DBSQLClient } from '@databricks/sql';

export const maxDuration = 300;

export async function GET() {
    const HOST = process.env.DATABRICKS_HOST;
    const PATH = process.env.DATABRICKS_HTTP_PATH;
    const TOKEN = process.env.DATABRICKS_TOKEN;
    const API_KEY = process.env.AI_SERVICE_CONF;

    if (!HOST || !PATH || !TOKEN) {
        return NextResponse.json({ error: 'Missing Databricks config', env: { hasHost: !!HOST, hasPath: !!PATH, hasToken: !!TOKEN, hasApiKey: !!API_KEY } });
    }

    try {
        const client = new DBSQLClient();
        await client.connect({ host: HOST, path: PATH, token: TOKEN });
        const session = await client.openSession();
        const operation = await session.executeStatement('SELECT 1 as test_col', { runAsync: true, maxRows: 1 });
        const result = await operation.fetchAll();
        await operation.close();
        await session.close();
        await client.close();

        return NextResponse.json({ success: true, result, env: { hasHost: !!HOST, hasPath: !!PATH, hasToken: !!TOKEN, hasApiKey: !!API_KEY } });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || String(e) });
    }
}
