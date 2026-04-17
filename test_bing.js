const axios = require('axios');
const cheerio = require('cheerio');

async function checkBing() {
  const query = 'site:linkedin.com/in "react developer" "@gmail.com"';
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=1`;
  console.log("Checking Bing...");
  try {
    const response = await axios.get(url, {
      headers: {
         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
         'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    const $ = cheerio.load(response.data);
    const text = $('body').text();
    const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
    console.log("Emails found:", emails ? new Set(emails).size : 0);
  } catch(e) {
    console.error(e.message);
  }
}
checkBing();
