const axios = require('axios');

async function triggerLinkedinSweep() {
    console.log("Launching LinkedIn Industrial Sweep...");
    try {
        const payload = {
            keywords: "CEO Manager Director",
            location: "South Africa",
            source: "linkedin", 
            emailProviders: ["gmail.com", "co.za"],
            allowCompanyDomain: true,
            turbo: true // 10 pages deep scan
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 120000 
        });

        if (res.data && res.data.success) {
            console.log(`--- LINKEDIN HARVEST SUCCESSFUL ---`);
            console.log(`Total Leads Found: ${res.data.count}`);
            console.log(`Top Leads:`);
            res.data.emails.forEach((e, i) => console.log(`${i+1}. ${e}`));
        } else {
            console.log("LinkedIn search returned zero results. Engines might be currently blocked.");
        }
    } catch(e) {
        console.error("LinkedIn Harvest Error:", e.message);
    }
}
triggerLinkedinSweep();
