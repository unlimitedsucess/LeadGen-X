const axios = require('axios');
const cheerio = require('cheerio');

async function testFetch() {
    const q = 'site:linkedin.com/in "react developer" South Africa "@gmail.com"';
    const o = 0;
    console.log("Testing Bing Proxy...");
    try {
        const targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&first=${o+1}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const res = await axios.get(proxyUrl, { timeout: 15000 });
        const html = res.data.contents || "";
        console.log("Bing Output text length:", html.length);
        
        const emails = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
        console.log("Emails found in Bing:", emails ? new Set(emails).size : 0);
    } catch(e) {
        console.error("Bing Error:", e.message);
    }

    console.log("\nTesting Yahoo Proxy...");
    try {
        const targetUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(q)}&b=${o+1}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const res = await axios.get(proxyUrl, { timeout: 15000 });
        const html = res.data.contents || "";
        console.log("Yahoo Output text length:", html.length);
        
        const emails = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
        console.log("Emails found in Yahoo:", emails ? new Set(emails).size : 0);
    } catch(e) {
        console.error("Yahoo Error:", e.message);
    }
}
testFetch();
