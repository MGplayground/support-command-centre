const { ipcMain } = require('electron');
const https = require('https');

async function testGemini() {
    console.log('🧪 Testing Gemini Handler...');
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY missing');
        return;
    }

    const requestBody = {
        contents: [{
            parts: [{ text: "Hello, tell me a joke about support agents." }]
        }]
    };

    const data = JSON.stringify(requestBody);
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            console.log('✅ Response Status:', res.statusCode);
            console.log('✅ Response Body:', responseData.substring(0, 200) + '...');
        });
    });

    req.on('error', (e) => console.error('❌ Error:', e));
    req.write(data);
    req.end();
}

testGemini();
