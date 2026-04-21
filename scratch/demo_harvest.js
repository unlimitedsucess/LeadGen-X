const axios = require('axios');

async function triggerLargeSearch() {
    console.log("Starting Deep Harvest Test: 'Real Estate' in South Africa...");
    try {
        const payload = {
            keywords: "Real Estate Property",
            location: "South Africa",
            source: "linkedin", 
            emailProviders: ["gmail.com", "yahoo.com", "co.za"],
            allowCompanyDomain: true,
            page: 1,
            turbo: true 
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 120000 // 2 minute timeout for a real deep search
        });

        if (res.data && res.data.success) {
            console.log(`--- HARVEST SUCCESSFUL ---`);
            console.log(`Total Emails Found: ${res.data.count}`);
            console.log(`Verified Leads:`);
            res.data.emails.forEach((e, i) => console.log(`${i+1}. ${e}`));
        } else {
            console.log("Search failed or returned zero results.");
        }
    } catch(e) {
        console.error("Critical Error during test:", e.message);
    }
}
triggerLargeSearch();
