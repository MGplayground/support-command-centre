import { getChurnRiskAccounts } from './src/lib/databricks.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log("Testing Churn Risk Accounts...");
    try {
        const churn = await getChurnRiskAccounts(null, 10);
        console.log("Success! Returned " + churn.length + " rows");
        console.log("Sample:", churn[0]);
    } catch (e) {
        console.error("FAILED churn:", e);
    }
}
test();
