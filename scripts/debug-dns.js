const dns = require('dns');
const https = require('https');

console.log('--- Network Diagnostic ---');
console.log('Timestamp:', new Date().toISOString());

console.log('1. Testing DNS Lookup for api.intercom.io...');
dns.lookup('api.intercom.io', (err, address, family) => {
    if (err) {
        console.error('❌ DNS Lookup FAILED:', err.code, err.message);
        process.exit(1);
    } else {
        console.log('✅ DNS Lookup SUCCESS:', address, '(Family ' + family + ')');

        console.log('2. Testing HTTPS Handshake...');
        const options = {
            hostname: 'api.intercom.io',
            path: '/conversations', // Just hitting endpoint to check connection
            method: 'GET',
            headers: { 'User-Agent': 'Node Diagnostic' }
        };

        const req = https.request(options, (res) => {
            console.log('✅ HTTPS Connection ESTABLISHED');
            console.log('   Status Code:', res.statusCode);
            console.log('   Headers:', JSON.stringify(res.headers));
            process.exit(0);
        });

        req.on('error', (e) => {
            console.error('❌ HTTPS Connection FAILED:', e.message);
            process.exit(1);
        });

        req.setTimeout(5000, () => {
            console.error('❌ HTTPS Connection TIMED OUT');
            req.destroy();
            process.exit(1);
        });

        req.end();
    }
});
