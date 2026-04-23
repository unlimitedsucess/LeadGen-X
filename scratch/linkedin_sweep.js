const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function triggerLinkedinSweep() {
    console.log("Launching LinkedIn Industrial Sweep (Local IP)...");
    const keywords = ["CEO", "Manager", "Director", "Marketing", "Software", "Sales"];
    const location = "South Africa";
    const emailsFound = new Set();

    for (const kw of keywords) {
        if (emailsFound.size >= 150) break;
        const query = `site:linkedin.com/in "${kw}" "${location}" "@gmail.com"`;
        console.log(`\nScanning: ${query}`);
        
        for (let page = 0; page < 5; page++) {
            try {
                const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${page * 10 + 1}`;
                const res = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 10000
                });
                
                const $ = cheerio.load(res.data);
                const text = $('body').text();
                const matches = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi) || [];
                
                let added = 0;
                matches.forEach(e => {
                    const clean = e.toLowerCase();
                    if (!emailsFound.has(clean) && clean.includes('@') && clean.length > 8) {
                        emailsFound.add(clean);
                        added++;
                    }
                });
                
                if (added > 0) {
                    console.log(`  -> Page ${page + 1}: Found ${added} new leads. Total: ${emailsFound.size}`);
                }
                
                await new Promise(r => setTimeout(r, 2500)); // sleep to avoid immediate ban
            } catch (e) {
                console.log(`  -> Page ${page + 1} blocked or failed.`);
            }
        }
    }

    console.log(`\n--- LINKEDIN HARVEST SUCCESSFUL ---`);
    console.log(`Total Leads Found: ${emailsFound.size}`);
    const results = Array.from(emailsFound);
    fs.writeFileSync('scratch/linkedin_leads_local.json', JSON.stringify(results, null, 2));
    console.log(`Saved leads to scratch/linkedin_leads_local.json`);
}

triggerLinkedinSweep();
