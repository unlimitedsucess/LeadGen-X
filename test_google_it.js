const googleIt = require('google-it');

async function test() {
  try {
    const results = await googleIt({ query: 'site:linkedin.com/in "react developer" "@gmail.com"', limit: 50 });
    console.log("Found results:", results.length);
    let emails = [];
    results.forEach(item => {
      const text = item.title + ' ' + item.snippet;
      const matched = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
      if(matched) emails.push(...matched);
    });
    console.log("Emails found:", new Set(emails).size);
  } catch (e) {
    console.log(e.message);
  }
}
test();
