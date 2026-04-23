const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractEmails(text) {
  const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;
  return text.match(rx) || [];
}

async function scrapeDDG() {
  const cities = ['Johannesburg', 'Cape Town', 'Pretoria', 'Durban', 'Port Elizabeth', 'Bloemfontein'];
  const keywords = 'Manager';
  const emails = new Set();
  
  for (const city of cities) {
    if (emails.size >= 150) break;
    const query = `site:linkedin.com/in "${keywords}" "${city}" "@gmail.com"`;
    console.log("Searching: " + query);
    let url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    for(let i=0; i<8; i++) {
      try {
        const res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 10000
        });
        const text = res.data;
        const found = extractEmails(text);
        
        let newFound = 0;
        found.forEach(e => {
          let em = e.toLowerCase();
          if(!em.includes('duckduckgo') && !em.includes('example') && em.length > 8) {
            if(!emails.has(em)) {
              emails.add(em);
              newFound++;
            }
          }
        });
        
        if(newFound > 0) {
            console.log(`  -> Page ${i+1}: found ${newFound} new leads (Total: ${emails.size})`);
        }
        
        const $ = cheerio.load(text);
        const nextBtn = $('.nav-link input[value="Next"]');
        if(nextBtn.length > 0) {
          const form = nextBtn.closest('form');
          const s = form.find('input[name="s"]').val();
          const vqd = form.find('input[name="vqd"]').val();
          url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${s}&vqd=${vqd}`;
          await sleep(2000);
        } else {
          break; // no more pages
        }
      } catch(e) {
        console.log("  -> DDG Rate limit or error:", e.message);
        break;
      }
    }
  }
  
  const final = Array.from(emails);
  let md = '# 🎯 LinkedIn Extracted Leads: "Manager"\n\n| # | Email Address | Source | Location |\n|---|---|---|---|\n';
  final.forEach((e, i) => md += `| ${i+1} | ${e} | LinkedIn (via DDG) | South Africa |\n`);
  fs.writeFileSync('scratch/manager_leads.md', md);
  console.log(`Saved ${final.length} LinkedIn leads.`);
}

scrapeDDG();
