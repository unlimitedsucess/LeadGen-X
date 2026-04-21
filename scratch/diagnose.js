const axios = require('axios');
const cheerio = require('cheerio');

async function diagnosEngines() {
    console.log("DIAGNOSTIC: Checking raw engine responses...");
    const query = 'site:linkedin.com "CEO" "South Africa" "gmail.com"';
    
    // Test Bing
    try {
        const res = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
            timeout: 5000
        });
        const $ = cheerio.load(res.data);
        console.log(`BING: Status ${res.status}, Text Length: ${$('body').text().length}`);
    } catch(e) {
        console.log(`BING FAILED: ${e.message}`);
    }

    // Test DDG
    try {
        const res = await axios.post('https://lite.duckduckgo.com/lite/', `q=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });
        console.log(`DDG: Status ${res.status}, Text Length: ${res.data.length}`);
    } catch(e) {
        console.log(`DDG FAILED: ${e.message}`);
    }

    // Test Yahoo
    try {
        const res = await axios.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });
        console.log(`YAHOO: Status ${res.status}, Text Length: ${res.data.length}`);
    } catch(e) {
        console.log(`YAHOO FAILED: ${e.message}`);
    }
}
diagnosEngines();
