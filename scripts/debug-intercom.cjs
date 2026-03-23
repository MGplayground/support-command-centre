const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TOKEN = process.env.VITE_INTERCOM_TOKEN;

console.log('--- INTERCOM DEBUG PROBE ---');
console.log('Token starts with:', TOKEN ? TOKEN.substring(0, 4) + '...' : 'UNDEFINED');

function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.intercom.io',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Intercom-Version': '2.10'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n[${method} ${path}] Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    console.log('Raw Data:', data);
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => {
            console.error('Request Error:', e);
            reject(e);
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

(async () => {
    try {
        // 1. Check Identity
        console.log('\n1. Checking /me ...');
        const me = await request('/me');
        console.log('Response:', JSON.stringify(me, null, 2));

        // 2. Check Admins
        console.log('\n2. Checking /admins ...');
        const admins = await request('/admins');
        if (admins.admins) {
            console.log(`Found ${admins.admins.length} admins.`);
            console.log('First Admin:', JSON.stringify(admins.admins[0], null, 2));
        } else {
            console.log('Admins Response:', JSON.stringify(admins, null, 2));
        }

        // 3. Search Conversations (Check Date Filter & Structure)
        console.log('\n3. Searching Conversations (Last 7 Days)...');
        const now = Math.floor(Date.now() / 1000);
        const sevenDaysAgo = now - (7 * 86400);
        const query = {
            query: {
                operator: "AND",
                value: [
                    { field: "state", operator: "=", value: "closed" },
                    { field: "updated_at", operator: ">", value: sevenDaysAgo }
                ]
            }
        };
        const search = await request('/conversations/search', 'POST', query);
        console.log('Total Count:', search.total_count);
        if (search.conversations && search.conversations.length > 0) {
            console.log('Sample Conversation:', JSON.stringify(search.conversations[0], null, 2));
        } else {
            console.log('Full Search Response:', JSON.stringify(search, null, 2));
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
})();
