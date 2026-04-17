const axios = require('axios');
const cheerio = require('cheerio');

async function testAllOrigins() {
  try {
    const query = 'site:linkedin.com/in "react developer" "@gmail.com"';
    const targetUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=1`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    const res = await axios.get(proxyUrl);
    const html = res.data.contents;
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
    console.log("Yahoo via Proxy Emails found:", emails ? new Set(emails).size : 0);
  } catch(e) {
    console.error(e.message);
  }
}
testAllOrigins();
