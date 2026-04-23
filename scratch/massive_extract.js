const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractEmails(text) {
  const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;
  const emails = text.match(rx) || [];
  return emails.filter(e => {
    if(e.length < 7) return false;
    const [u, d] = e.split('@');
    if(!u || !d || !d.includes('.')) return false;
    const junk = ['noreply', 'test', 'example', 'sentry', 'wix', 'godaddy', 'domain', 'placeholder'];
    if(junk.some(j => e.includes(j))) return false;
    if(/^\d{5,}$/.test(u)) return false;
    if(/\.(png|jpg|gif|svg|webp|js|css|woff)$/i.test(e)) return false;
    return true;
  }).map(e => e.toLowerCase());
}

async function scrapeDDG(query) {
  const emails = new Set();
  try {
    const res = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });
    const found = extractEmails(res.data);
    found.forEach(e => emails.add(e));
  } catch (err) {
    console.error(`DDG Error for ${query}:`, err.message);
  }
  return [...emails];
}

async function scrapeYahoo(query, pages = 5) {
  const emails = new Set();
  for (let p = 0; p < pages; p++) {
    const b = p * 10 + 1;
    try {
      const res = await axios.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${b}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      const found = extractEmails(res.data);
      found.forEach(e => emails.add(e));
      await sleep(1000);
    } catch (err) {
      console.error(`Yahoo Error for ${query} page ${p}:`, err.message);
      break;
    }
  }
  return [...emails];
}

async function run() {
  const queries = [
    '"marketing" "South Africa" "@gmail.com"',
    '"real estate" "South Africa" "@gmail.com"',
    '"software developer" "South Africa" "@gmail.com"',
    '"sales manager" "South Africa" "@gmail.com"',
    '"director" "South Africa" "@gmail.com"',
    '"consultant" "South Africa" "@gmail.com"',
    '"accountant" "South Africa" "@gmail.com"',
    '"founder" "South Africa" "@gmail.com"',
    '"CEO" "South Africa" "@gmail.com"',
    '"HR manager" "South Africa" "@gmail.com"',
    '"designer" "South Africa" "@gmail.com"',
    '"business owner" "South Africa" "@gmail.com"'
  ];

  const allEmails = new Set();
  console.log(`Starting massive extraction across ${queries.length} queries...`);

  for (const q of queries) {
    console.log(`Searching: ${q}`);
    const ddg = await scrapeDDG(q);
    ddg.forEach(e => allEmails.add(e));
    
    const yahoo = await scrapeYahoo(q, 3);
    yahoo.forEach(e => allEmails.add(e));
    
    console.log(`  -> Found so far: ${allEmails.size}`);
    if (allEmails.size >= 200) break;
    await sleep(2000);
  }

  const final = [...allEmails].slice(0, 200);
  console.log(`\n\n--- EXTRACTION COMPLETE: ${final.length} EMAILS ---`);
  
  fs.writeFileSync('scratch/extracted_emails.json', JSON.stringify(final, null, 2));
  console.log('Saved to scratch/extracted_emails.json');
}

run();
