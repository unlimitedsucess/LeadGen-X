const axios = require('axios');

async function triggerApi() {
    console.log("Triggering FAST API (Non-Turbo)...");
    try {
        const payload = {
            keywords: "manager",
            location: "South Africa",
            source: "linkedin", 
            emailProviders: ["gmail.com"],
            allowCompanyDomain: false,
            page: 1,
            turbo: false // Set to false for a quick proof of life
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 60000
        });

        console.log("API Response Status:", res.status);
        if (res.data) {
            console.log("Success:", res.data.success);
            console.log("Emails found:", res.data.count);
            if (res.data.emails && res.data.emails.length > 0) {
                console.log("Samples:", res.data.emails.slice(0, 5));
            }
        }
    } catch(e) {
        console.error("API error:", e.response ? e.response.data : e.message);
    }
}
triggerApi();
