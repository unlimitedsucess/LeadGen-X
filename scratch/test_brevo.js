const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/BREVO_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

async function testBrevo() {
    const senderEmail = 'support@elgreenglobal.com';
    const recipientEmail = 'unlimitedsuccess2024@gmail.com'; 

    console.log('Testing Brevo API...');
    console.log('API Key (first 10 chars):', apiKey?.substring(0, 10));
    console.log('Sender:', senderEmail);

    if (!apiKey) {
        console.log('❌ FAILED: API Key not found in .env.local');
        return;
    }

    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'Test User', email: senderEmail },
            to: [{ email: recipientEmail }],
            subject: 'Brevo Integration Test',
            textContent: 'This is a test to verify the Brevo API connection is working.'
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            }
        });

        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ FAILED!');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error Details:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testBrevo();
