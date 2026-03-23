require('dotenv').config();
const https = require('https');

const TOKEN = process.env.VITE_INTERCOM_TOKEN;

function search(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            query,
            pagination: { per_page: 5 }
        });
        
        const req = https.request({
            hostname: 'api.intercom.io',
            path: '/conversations/search',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Intercom-Version': '2.14',
                'Accept': 'application/json',
                'Content-Length': body.length
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

(async () => {
    // Search for recently closed
    const now = Math.floor(Date.now() / 1000);
    const result = await search({
        field: 'statistics.last_close_at',
        operator: '>',
        value: now - (86400 * 30) // Last 30 days
    });
    
    if (result.conversations && result.conversations.length) {
        console.log('Fields available in 2.14:');
        const c = result.conversations[0];
        console.log('Statistics:', JSON.stringify(c.statistics, null, 2));
        console.log('Teammates:', JSON.stringify(c.teammates, null, 2));
        console.log('Last closed by:', c.statistics.last_closed_by_id);
    } else {
        console.log('No recent conversations found');
    }
})();
