const googleIt = require('google-it');
googleIt({ query: 'site:linkedin.com/in "South Africa" "@gmail.com"', limit: 50 })
  .then(res => {
    console.log(res.length);
    console.log(JSON.stringify(res, null, 2));
  }).catch(console.error);
