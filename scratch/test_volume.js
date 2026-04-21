const axios = require('axios');

async function triggerHighVolumeTest() {
    console.log("Starting Goal-Driven 100+ Search: 'Real Estate' in South Africa...");
    try {
        const payload = {
            keywords: "Real Estate Property",
            location: "South Africa",
            source: "linkedin", 
            emailProviders: ["gmail.com", "yahoo.com", "co.za"],
            allowCompanyDomain: true,
            page: 1,
            turbo: true // 10 pages, 6 keywords
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 180000 // 3 minutes for a massive deep scan
        });

        if (res.data && res.data.success) {
            console.log(`--- INDUSTRIAL HARVEST SUCCESSFUL ---`);
            console.log(`Total Verified Emails Found: ${res.data.count}`);
            console.log(`Sample Leads (Top 10):`);
            res.data.emails.slice(0, 10).forEach((e, i) => console.log(`${i+1}. ${e}`));
        } else {
            console.log("Search failed or returned zero results.");
        }
    } catch(e) {
        console.error("Test Error:", e.message);
    }
}
triggerHighVolumeTest();
