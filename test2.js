const google = require('googlethis');

async function check() {
  const options = {
    page: 0,
    safe: false,
    parse_ads: false,
    additional_params: { hl: 'en' }
  };
  console.log("Checking Google This...");
  try {
    const response = await google.search('site:linkedin.com/in "react developer" "@gmail.com"', options);
    console.log("Result length:", response.results.length);
    if(response.results.length > 0) {
        console.log(response.results[0].description);
    }
  } catch(e) {
    console.error(e);
  }
}
check();
