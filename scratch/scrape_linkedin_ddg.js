const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractEmails(text) {
  const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;
  return text.match(rx) || [];
}

async function scrapeDDG() {
  const query = 'site:linkedin.com/in "South Africa" "@gmail.com"';
  const emails = new Set();
  let url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  for(let i=0; i<15; i++) {
    console.log("Scraping page " + (i+1));
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      const text = res.data;
      const found = extractEmails(text);
      found.forEach(e => {
        let em = e.toLowerCase();
        if(!em.includes('duckduckgo') && !em.includes('example.com') && em.length > 8) {
          emails.add(em);
        }
      });
      
      const $ = cheerio.load(text);
      const nextBtn = $('.nav-link input[value="Next"]');
      if(nextBtn.length > 0) {
        const form = nextBtn.closest('form');
        const s = form.find('input[name="s"]').val();
        const vqd = form.find('input[name="vqd"]').val();
        url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${s}&vqd=${vqd}`;
        await sleep(2500);
      } else {
        break;
      }
    } catch(e) {
      console.log("DDG Error:", e.message);
      break;
    }
  }
  
  const final = Array.from(emails);
  let md = '# 🎯 LinkedIn Extracted Leads (DDG)\n\n| # | Email Address | Source |\n|---|---|---|\n';
  final.forEach((e, i) => md += `| ${i+1} | ${e} | LinkedIn (via DDG) |\n`);
  fs.writeFileSync('scratch/linkedin_leads.md', md);
  console.log(`Saved ${final.length} LinkedIn leads.`);
}

scrapeDDG();
