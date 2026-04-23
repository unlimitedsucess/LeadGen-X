const axios = require('axios');
axios.get('https://api.allorigins.win/get?url=' + encodeURIComponent('https://html.duckduckgo.com/html/?q=site:linkedin.com/in+"Manager"+"South+Africa"+"@gmail.com"'))
.then(res => {
  const text = res.data.contents;
  const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
  console.log(match ? new Set(match).size : 0);
}).catch(console.error);
