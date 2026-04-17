const axios = require('axios');

async function testGitHub() {
  try {
    const q = 'react developer';
    // GitHub commit search returns author details including email
    const res = await axios.get(`https://api.github.com/search/commits?q=${encodeURIComponent(q)}&per_page=50`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NodeJS'
      }
    });

    const emails = new Set();
    res.data.items.forEach(item => {
      if (item.commit && item.commit.author && item.commit.author.email) {
        let email = item.commit.author.email;
        if (!email.includes('noreply') && email.includes('@gmail.com')) {
          emails.add(email);
        }
      }
    });

    console.log("GitHub Emails found:", emails.size);
    console.log(Array.from(emails).slice(0, 5));
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
testGitHub();
