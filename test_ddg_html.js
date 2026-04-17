const axios = require('axios');
const cheerio = require('cheerio');

async function checkDDGHtml() {
  const query = 'site:linkedin.com/in "react developer" "@gmail.com"';
  console.log("Checking DDG HTML...");
  try {
    const response = await axios.post('https://html.duckduckgo.com/html/', `q=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const text = $('body').text();
    const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
    console.log("Emails found:", emails ? new Set(emails).size : 0);
    console.log(emails);
  } catch(e) {
    console.error(e.message);
  }
}
checkDDGHtml();
