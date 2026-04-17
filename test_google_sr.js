const { search } = require('google-sr');

async function check() {
    try {
        const query = 'site:linkedin.com/in "marketing" "south africa" "@gmail.com"';
        const res = await search({ query });
        console.log("length:", res.length);
        if(res.length > 0) {
            console.log(res[0]);
        }
    } catch(e) {
        console.log(e.message);
    }
}
check();
