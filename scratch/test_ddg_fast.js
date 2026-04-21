const axios = require('axios');
const cheerio = require('cheerio');

async function testDDGLite() {
    console.log("Testing DDG Lite...");
    const query = 'site:linkedin.com "react developer" "gmail.com"';
    try {
        const res = await axios.post('https://lite.duckduckgo.com/lite/', `q=${encodeURIComponent(query)}&s=0&dc=10`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });
        const $ = cheerio.load(res.data);
        const text = $('body').text();
        const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
        console.log(`DDG Scrape text length: ${text.length}`);
        console.log(`DDG Emails found: ${emails.length}`);
        if(emails.length > 0) {
            console.log(emails.slice(0, 5));
        }
    } catch (e) {
        console.error("DDG Error:", e.message);
    }
}

testDDGLite();
