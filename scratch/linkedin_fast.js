const axios = require('axios');

async function triggerFastLinkedinSweep() {
    console.log("Fetching first batch of LinkedIn leads...");
    try {
        const payload = {
            keywords: "CEO Director",
            location: "South Africa",
            source: "linkedin", 
            emailProviders: ["gmail.com", "co.za"],
            allowCompanyDomain: true,
            turbo: false // 3 pages deep for a quick demo
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 60000 
        });

        if (res.data && res.data.success) {
            console.log(`--- LINKEDIN HARVEST SUCCESSFUL ---`);
            console.log(`Leads Found: ${res.data.count}`);
            console.log(`Top Leads:`);
            res.data.emails.forEach((e, i) => console.log(`${i+1}. ${e}`));
        } else {
            console.log("No leads found in this batch.");
        }
    } catch(e) {
        console.error("LinkedIn Harvest Error:", e.message);
    }
}
triggerFastLinkedinSweep();
