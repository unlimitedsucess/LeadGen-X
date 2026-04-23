const puppeteer = require('puppeteer');
const path = require('path');
const os = require('os');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function extractFromPage(page) {
  return page.evaluate(() => {
    const emails = new Set();
    const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;
    (document.body?.innerText?.match(rx) || []).forEach(e => emails.add(e.toLowerCase()));
    return [...emails];
  });
}

async function scrapeBing(browser, query, candidates) {
  console.log(`[Bing] Searching: ${query}`);
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  try {
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1000);
    const found = await extractFromPage(page);
    found.forEach(e => candidates.add(e));
    console.log(`[Bing] Found ${found.length} leads`);
  } catch (e) { console.log(`[Bing] Error: ${e.message}`); }
  finally { await page.close(); }
}

async function scrapeYahoo(browser, query, candidates) {
  console.log(`[Yahoo] Searching: ${query}`);
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  try {
    await page.goto(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1000);
    const found = await extractFromPage(page);
    found.forEach(e => candidates.add(e));
    console.log(`[Yahoo] Found ${found.length} leads`);
  } catch (e) { console.log(`[Yahoo] Error: ${e.message}`); }
  finally { await page.close(); }
}

async function runTest() {
  const startTime = Date.now();
  const keywords = "manager";
  const location = "south africa";
  const query = `"${keywords}" "${location}" "@gmail.com"`;
  const candidates = new Set();

  console.log(`--- SPEED TEST START ---`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Run Bing and Yahoo in parallel
    await Promise.all([
      scrapeBing(browser, query, candidates),
      scrapeYahoo(browser, query, candidates)
    ]);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n--- RESULTS ---`);
    console.log(`Total Leads Found: ${candidates.size}`);
    console.log(`Time Taken: ${duration.toFixed(2)} seconds`);
    console.log(`Sample Leads:`, Array.from(candidates).slice(0, 5));
    
  } finally {
    await browser.close();
  }
}

runTest();
