const { search: googleSearch, OrganicResult } = require('google-sr');
const axios = require('axios');
const cheerio = require('cheerio');

async function diagnostic() {
    const kw = "real estate South Africa";
    console.log("--- GOOGLE SR TEST ---");
    try {
        const results = await googleSearch({ query: kw, parsers: [OrganicResult] });
        console.log("Google SR Found:", results.length, "results");
    } catch (e) { console.error("Google SR Failed:", e.message); }

    console.log("\n--- BING TEST ---");
    try {
        const res = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(kw)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);
        console.log("Bing Results Length:", $('body').text().length);
    } catch (e) { console.error("Bing Failed:", e.message); }

    console.log("\n--- YAHOO TEST ---");
    try {
        const res = await axios.get(`https://search.yahoo.com/search?p=${encodeURIComponent(kw)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);
        console.log("Yahoo Results Length:", $('body').text().length);
    } catch (e) { console.error("Yahoo Failed:", e.message); }
}

diagnostic();
