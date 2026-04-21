const axios = require('axios');

async function triggerFinalProof() {
    console.log("Launching Final Proof Harvest: 'Real Estate' in South Africa...");
    try {
        const payload = {
            keywords: "Real Estate Manager",
            location: "South Africa",
            emailProviders: ["gmail.com", "co.za"],
            allowCompanyDomain: true,
            turbo: false // Guaranteed harvest will still ensure results
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 600000 
        });

        if (res.data && res.data.success) {
            console.log(`--- PROOF SUCCESSFUL ---`);
            console.log(`Total Leads Found: ${res.data.count}`);
            console.log(`Verified Emails:`);
            res.data.emails.forEach((e, i) => console.log(`${i+1}. ${e}`));
        } else {
            console.log("Search finished but returned 0 results. Check server logs.");
        }
    } catch(e) {
        console.error("Harvest Error:", e.message);
    }
}
triggerFinalProof();
