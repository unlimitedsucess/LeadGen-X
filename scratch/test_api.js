const axios = require('axios');

async function triggerApi() {
    console.log("Triggering API...");
    try {
        const payload = {
            keywords: "real estate",
            location: "South Africa",
            source: "linkedin", // this is what page.tsx passes
            emailProviders: ["gmail", "yahoo", "co_za"],
            allowCompanyDomain: true,
            page: 1,
            turbo: true
        };

        const res = await axios.post('http://localhost:3000/api/extract', payload, {
            timeout: 60000
        });

        console.log("API Response Status:", res.status);
        if (res.data) {
            console.log("Success:", res.data.success);
            console.log("Emails returned:", res.data.count);
            if (res.data.emails && res.data.emails.length > 0) {
                console.log(res.data.emails.slice(0, 3));
            }
        }
    } catch(e) {
        console.error("API error:", e.message);
    }
}
triggerApi();
