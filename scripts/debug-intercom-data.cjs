const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TOKEN = process.env.VITE_INTERCOM_TOKEN;

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
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Raw:', data);
                    resolve({});
                }
            });
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

(async () => {
    // Search for 1 closed conversation
    const query = {
        query: {
            operator: "AND",
            value: [
                { field: "state", operator: "=", value: "closed" }
            ]
        },
        pagination: { per_page: 1 }
    };

    console.log('Fetching 1 conversation...');
    const data = await request('/conversations/search', 'POST', query);

    if (data.conversations && data.conversations.length > 0) {
        const c = data.conversations[0];
        console.log('--- DATA STRUCTURE ---');
        console.log('Admin Assignee ID:', c.admin_assignee_id);
        console.log('Assignee Object:', JSON.stringify(c.assignee, null, 2));
        console.log('Statistics:', JSON.stringify(c.statistics, null, 2));

        // Check parts if available (sometimes contains author)
        if (c.conversation_parts && c.conversation_parts.conversation_parts) {
            console.log('Parts Author:', JSON.stringify(c.conversation_parts.conversation_parts[0].author, null, 2));
        }
    } else {
        console.log('No conversations found or error:', JSON.stringify(data, null, 2));
    }
})();
