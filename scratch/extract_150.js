const axios = require('axios');
const fs = require('fs');

async function extract150() {
  try {
    const emails = new Set();
    const queries = ['South Africa developer', 'Johannesburg', 'Cape Town marketing', 'Durban'];
    
    for (const q of queries) {
      for (let page = 1; page <= 5; page++) {
        try {
          const res = await axios.get(`https://api.github.com/search/commits?q=${encodeURIComponent(q)}&per_page=100&page=${page}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'NodeJS'
            }
          });
          
          res.data.items.forEach(item => {
            if (item.commit && item.commit.author && item.commit.author.email) {
              let email = item.commit.author.email.toLowerCase();
              if (!email.includes('noreply') && !email.includes('github') && email.includes('@')) {
                emails.add(email);
              }
            }
          });
          
          if (emails.size >= 150) break;
          await new Promise(r => setTimeout(r, 2000));
        } catch(e) {
          console.error('API Limit hit or error');
          break;
        }
      }
      if (emails.size >= 150) break;
    }

    const final = Array.from(emails).slice(0, 150);
    let md = '# 🎯 Extracted Leads (150 Total)\n\n| # | Email Address | Source |\n|---|---|---|\n';
    final.forEach((e, i) => md += `| ${i+1} | ${e} | GitHub Scraper |\n`);
    
    fs.writeFileSync('scratch/leads.md', md);
    console.log(`Saved ${final.length} leads to scratch/leads.md`);
  } catch(e) {
    console.error(e.message);
  }
}
extract150();
