const axios = require('axios');
const cheerio = require('cheerio');

async function checkYahoo() {
  const query = 'site:linkedin.com/in "react developer" "@gmail.com"';
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=1`;
  console.log("Checking Yahoo...");
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;'
      }
    });
    
    const $ = cheerio.load(response.data);
    const text = $('body').text();
    const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
    console.log("Emails found:", emails ? new Set(emails).size : 0);
    // console.log(emails);
  } catch(e) {
    console.error(e.message);
  }
}
checkYahoo();
