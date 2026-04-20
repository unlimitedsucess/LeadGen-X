const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function testBing() {
  try {
    const query = 'site:linkedin.com/in "software engineer" "@gmail.com"';
    const first = 1;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`;
    console.log("Testing Bing:", url);
    const res = await axios.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const text = $('body').text();
    console.log("Bing Text Length:", text.length);
    const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
    console.log("Bing Emails found:", new Set(emails.map(e => e.toLowerCase())).size);
  } catch (e) {
    console.log("Bing Error:", e.message);
  }
}

async function testYahoo() {
  try {
    const query = 'site:linkedin.com/in "software engineer" "@gmail.com"';
    const start = 1;
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${start}`;
    console.log("Testing Yahoo:", url);
    const res = await axios.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const text = $('body').text();
    console.log("Yahoo Text Length:", text.length);
    const emails = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
    console.log("Yahoo Emails found:", new Set(emails.map(e => e.toLowerCase())).size);
  } catch (e) {
    console.log("Yahoo Error:", e.message);
  }
}

async function run() {
  await testBing();
  await testYahoo();
}
run();
