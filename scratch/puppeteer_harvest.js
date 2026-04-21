/**
 * LeadGen X — Puppeteer Power Harvester v4
 * ─────────────────────────────────────────
 * Strategy: Click INTO individual company profiles for real contact details.
 * Targets: YellowPages ZA, Hotfrog ZA, Cylex ZA, Kompass ZA, Brabys, 
 *           Bizcommunity, SAIPA, SAPOA, SACSC, SA REIA (Real Estate specific)
 *
 * Usage:
 *   node scratch/puppeteer_harvest.js "Real Estate" "South Africa"
 *   node scratch/puppeteer_harvest.js "Property Manager" "Johannesburg"
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const KEYWORDS = process.argv[2] || 'Real Estate Agent';
const LOCATION  = process.argv[3] || 'South Africa';
const TARGET    = 100;

// ── Utils ──────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

const JUNK = [
  'noreply','no-reply','mailer-daemon','postmaster','bounce','webmaster',
  'abuse','spam','test','demo','example','sample','placeholder',
  'support@sentry','@2x','webpack','localhost','schema.org',
  'wpcf7','contact@example','office@example','info@example',
];

function isGenuine(email) {
  if (!email || typeof email !== 'string' || email.length < 7) return false;
  if (!email.includes('@') || (email.match(/@/g)||[]).length !== 1) return false;
  const [u, d] = email.split('@');
  if (!u || !d || !d.includes('.')) return false;
  if (JUNK.some(j => email.toLowerCase().includes(j))) return false;
  if (/^\d{4,}$/.test(u)) return false;
  if (/^[a-f0-9]{12,}$/i.test(u)) return false;
  if (/\.(png|jpg|gif|svg|webp|js|css|woff|ttf|eot)$/i.test(email)) return false;
  const tld = d.split('.').pop() || '';
  if (tld.length < 2 || tld.length > 10) return false;
  // Filter obvious CSS/JS artifacts
  if (d.includes('{') || d.includes('}') || u.includes('{')) return false;
  return true;
}

function dedupe(arr) { return [...new Set(arr.filter(isGenuine).map(e => e.toLowerCase().trim()))]; }

// ── Browser Factory ────────────────────────────────────────────────────────

async function makeBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--window-size=1366,768',
    ],
    defaultViewport: { width: 1366, height: 768 },
  });
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  // Block heavy resources for speed
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image','font','media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  return page;
}

// ── Email Extraction (runs inside browser) ─────────────────────────────────

async function grabEmails(page) {
  try {
    return await page.evaluate(() => {
      const found = new Set();
      const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;

      // 1. Visible text
      (document.body?.innerText?.match(rx) || []).forEach(e => found.add(e.toLowerCase()));

      // 2. mailto: anchors
      document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
        const raw = el.getAttribute('href').replace('mailto:','').split(/[?&]/)[0].trim();
        if (raw.includes('@')) found.add(raw.toLowerCase());
      });

      // 3. data attributes
      ['data-email','data-mail','data-contact','data-href'].forEach(attr => {
        document.querySelectorAll(`[${attr}]`).forEach(el => {
          const v = el.getAttribute(attr) || '';
          if (v.includes('@')) found.add(v.toLowerCase());
        });
      });

      // 4. Full innerHTML decode (catches &#64; obfuscation)
      const html = document.documentElement.innerHTML
        .replace(/&#64;/g,'@').replace(/&#46;/g,'.').replace(/%40/g,'@')
        .replace(/\[at\]/gi,'@').replace(/\[dot\]/gi,'.')
        .replace(/\\u0040/g,'@');
      (html.match(rx) || []).forEach(e => found.add(e.toLowerCase()));

      return [...found];
    });
  } catch { return []; }
}

async function go(browser, url, waitMs = 2000) {
  const page = await newPage(browser);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(waitMs);
    const emails = await grabEmails(page);
    return dedupe(emails);
  } catch { return []; }
  finally { await page.close(); }
}

// ── Scrapers ───────────────────────────────────────────────────────────────

/**
 * YellowPages ZA — loads listings, then clicks into each company
 */
async function scrapeYPZA(browser, kw, found, log) {
  console.log('  Searching YellowPages ZA...');
  const listPage = await newPage(browser);

  for (let p = 1; p <= 8 && found.size < TARGET; p++) {
    try {
      const url = `https://www.yellowpages.co.za/search/?q=${encodeURIComponent(kw)}&p=${p}`;
      await listPage.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      await sleep(2000);

      // Grab company detail URLs from search results
      const detailLinks = await listPage.evaluate(() => {
        const links = new Set();
        document.querySelectorAll('.listing-name a, .company-name a, h2 a, h3 a, .biz-name a').forEach(a => {
          if (a.href && a.href.includes('yellowpages') && !a.href.includes('/search')) links.add(a.href);
        });
        return [...links].slice(0, 12);
      });

      // Also grab direct emails from listing page
      dedupe(await grabEmails(listPage)).forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});

      // Dive into each listing
      for (const link of detailLinks) {
        if (found.size >= TARGET) break;
        const emails = await go(browser, link, 1500);
        emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
        await sleep(600);
      }
    } catch(err) { /* continue */ }
    await sleep(1000);
  }
  await listPage.close();
}

/**
 * Hotfrog ZA — rich directory, often shows emails directly
 */
async function scrapeHotfrog(browser, kw, found, log) {
  console.log('  Searching Hotfrog ZA...');
  for (let p = 1; p <= 5 && found.size < TARGET; p++) {
    const url = `https://www.hotfrog.co.za/search/south-africa/${encodeURIComponent(kw.replace(/\s+/g,'+'))}/${p}`;
    const emails = await go(browser, url, 2000);
    emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
    await sleep(700);
  }
}

/**
 * Cylex ZA — European B2B directory, SA branch
 */
async function scrapeCylex(browser, kw, found, log) {
  console.log('  Searching Cylex ZA...');
  const page = await newPage(browser);
  for (let p = 1; p <= 5 && found.size < TARGET; p++) {
    try {
      const url = `https://www.cylex.co.za/search.html?what=${encodeURIComponent(kw)}&pagenum=${p}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2000);

      const listLinks = await page.evaluate(() =>
        [...document.querySelectorAll('a.company-link, .company-name a, h2 a')]
          .map(a => a.href).filter(h => h && h.includes('cylex')).slice(0, 10)
      );

      dedupe(await grabEmails(page)).forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});

      for (const link of listLinks) {
        if (found.size >= TARGET) break;
        const emails = await go(browser, link, 1500);
        emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
        await sleep(500);
      }
    } catch { /* continue */ }
    await sleep(800);
  }
  await page.close();
}

/**
 * Kompass ZA — International B2B, strong SA manufacturing/property listings
 */
async function scrapeKompass(browser, found, log) {
  console.log('  Searching Kompass ZA...');
  const cats = [
    'https://za.kompass.com/a/real-estate-companies/99011/south-africa/za/',
    'https://za.kompass.com/a/property-management/99011002/',
    'https://za.kompass.com/a/real-estate-agents/99011004/',
  ];
  for (const url of cats) {
    if (found.size >= TARGET) break;
    const page = await newPage(browser);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2000);

      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href*="/c/"]')].map(a => a.href).slice(0, 15)
      );
      dedupe(await grabEmails(page)).forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});

      for (const link of links) {
        if (found.size >= TARGET) break;
        const emails = await go(browser, link, 1500);
        emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
        await sleep(400);
      }
    } catch { /* continue */ }
    finally { await page.close(); }
    await sleep(800);
  }
}

/**
 * Bizcommunity — SA's #1 B2B platform  
 */
async function scrapeBizcommunity(browser, found, log) {
  console.log('  Searching Bizcommunity.com...');
  const cats = [
    'https://www.bizcommunity.com/Companies/196/91.html',   // Real Estate
    'https://www.bizcommunity.com/Companies/196/11.html',   // Marketing
    'https://www.bizcommunity.com/Companies/196/181.html',  // Finance
    'https://www.bizcommunity.com/Companies/196/201.html',  // HR
    'https://www.bizcommunity.com/Companies/196/301.html',  // Construction
  ];
  const page = await newPage(browser);
  for (const url of cats) {
    if (found.size >= TARGET) break;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(1500);

      const compLinks = await page.evaluate(() =>
        [...document.querySelectorAll('a[href*="/Company/"]')].map(a => a.href).slice(0, 15)
      );
      dedupe(await grabEmails(page)).forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});

      for (const link of compLinks) {
        if (found.size >= TARGET) break;
        const emails = await go(browser, link, 1500);
        emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
        await sleep(500);
      }
    } catch { /* continue */ }
    await sleep(1000);
  }
  await page.close();
}

/**
 * SA Real Estate Industry Associations — membership directories
 */
async function scrapeIndustryAssociations(browser, found, log) {
  console.log('  Scraping Industry Associations...');
  const urls = [
    'https://www.sapoa.org.za/members',
    'https://www.sacsc.co.za/members',
    'https://www.eaab.org.za/estate_agents_search',
    'https://www.ieasa.org.za/members/',
    'https://www.reia.co.za/members/',
  ];
  for (const url of urls) {
    if (found.size >= TARGET) break;
    const emails = await go(browser, url, 2500);
    emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
    await sleep(700);
  }
}

/**
 * Province-level deep scan on most productive sites
 */
async function provinceSweep(browser, kw, found, log) {
  console.log('  Province sweep...');
  const cities = ['johannesburg','cape-town','durban','pretoria','port-elizabeth','bloemfontein'];
  for (const city of cities) {
    if (found.size >= TARGET) break;
    const urls = [
      `https://www.hotfrog.co.za/find/${encodeURIComponent(kw.replace(/\s+/g,'%20'))}/${city}`,
      `https://www.yellowpages.co.za/search/?q=${encodeURIComponent(kw+' '+city)}`,
    ];
    for (const url of urls) {
      const emails = await go(browser, url, 1500);
      emails.forEach(e => { if (!found.has(e)) { found.add(e); log(e); }});
      await sleep(500);
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   LeadGen X — Puppeteer Power Harvester v4      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Keywords : ${KEYWORDS}`);
  console.log(`  Location : ${LOCATION}`);
  console.log(`  Target   : ${TARGET}+ leads`);
  console.log(`  Engine   : Headless Chromium (JS Execution)\n`);

  const found = new Set();
  const log = e => process.stdout.write(`  [+] ${e}\n`);

  const browser = await makeBrowser();
  console.log('  ✓ Browser ready\n');

  try {
    await scrapeYPZA(browser, KEYWORDS, found, log);
    console.log(`\n  → ${found.size} leads after YellowPages\n`);

    if (found.size < TARGET) {
      await scrapeHotfrog(browser, KEYWORDS, found, log);
      console.log(`\n  → ${found.size} leads after Hotfrog\n`);
    }

    if (found.size < TARGET) {
      await scrapeCylex(browser, KEYWORDS, found, log);
      console.log(`\n  → ${found.size} leads after Cylex\n`);
    }

    if (found.size < TARGET) {
      await scrapeKompass(browser, found, log);
      console.log(`\n  → ${found.size} leads after Kompass\n`);
    }

    if (found.size < TARGET) {
      await scrapeBizcommunity(browser, found, log);
      console.log(`\n  → ${found.size} leads after Bizcommunity\n`);
    }

    if (found.size < TARGET) {
      await scrapeIndustryAssociations(browser, found, log);
      console.log(`\n  → ${found.size} leads after Associations\n`);
    }

    if (found.size < TARGET) {
      await provinceSweep(browser, KEYWORDS, found, log);
      console.log(`\n  → ${found.size} leads after Province Sweep\n`);
    }

  } finally {
    await browser.close();
  }

  const all = [...found];
  const fname = `scratch/leads_${Date.now()}.txt`;
  fs.writeFileSync(fname, all.join('\n'), 'utf8');

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  FINAL COUNT: ${String(all.length).padEnd(4)} LEADS                       ║`);
  console.log(`║  Saved to: ${fname.padEnd(38)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
  all.forEach((e, i) => console.log(`  ${String(i+1).padStart(3)}. ${e}`));
}

run().catch(err => { console.error('\n[FATAL]', err.message); process.exit(1); });
