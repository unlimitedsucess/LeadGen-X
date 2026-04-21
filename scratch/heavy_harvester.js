/**
 * LeadGen X — Standalone Directory Harvester
 * Bypasses search engines entirely. Scrapes SA business directories directly.
 * Run: node scratch/heavy_harvester.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const net = require('net');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const getUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function isGenuine(email) {
  if (!email || email.length < 6 || !email.includes('@')) return false;
  const u = email.split('@')[0].toLowerCase();
  const junk = ['noreply', 'no-reply', 'test', 'demo', 'example', 'sample', 'bounce', 'mailer'];
  if (junk.some(j => u.includes(j))) return false;
  if (/^\d{5,}$/.test(u)) return false;
  if (email.match(/\.(png|jpg|gif|svg|webp)$/i)) return false;
  return true;
}

function extractEmails(html) {
  const emails = new Set();

  // 1. Plain-text email regex
  const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;
  (html.match(rx) || []).forEach(e => emails.add(e.toLowerCase()));

  // 2. mailto: href extraction (catches obfuscated links)
  const mailtoRx = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;
  let m;
  while ((m = mailtoRx.exec(html)) !== null) emails.add(m[1].toLowerCase());

  // 3. HTML entity decode (e.g., &#64; = @)
  const decoded = html.replace(/&#64;/g, '@').replace(/&#46;/g, '.').replace(/\[at\]/gi, '@').replace(/\[dot\]/gi, '.');
  (decoded.match(rx) || []).forEach(e => emails.add(e.toLowerCase()));

  return [...emails].filter(isGenuine);
}

async function fetch(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': getUA(),
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-ZA,en;q=0.9',
        'Referer': 'https://www.google.co.za/',
      },
      timeout: 12000,
      maxRedirects: 5,
    });
    return typeof res.data === 'string' ? res.data : '';
  } catch(e) {
    return '';
  }
}

async function crawlContactLinks(html, limit = 8) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a[href]').each((_, el) => {
    const h = ($(el).attr('href') || '').toLowerCase();
    if ((h.includes('contact') || h.includes('about') || h.includes('team')) && h.startsWith('http')) {
      links.add($(el).attr('href'));
    }
  });
  const emails = [];
  for (const link of [...links].slice(0, limit)) {
    const page = await fetch(link);
    extractEmails(page).forEach(e => emails.push(e));
    await sleep(400);
  }
  return emails;
}

// ── SA Directory Sources ──────────────────────────────────────────────────────

const DIRS = {
  bizcommunity: [
    'https://www.bizcommunity.com/Companies/196/91.html',    // Real Estate
    'https://www.bizcommunity.com/Companies/196/11.html',    // Marketing
    'https://www.bizcommunity.com/Companies/196/181.html',   // Finance
    'https://www.bizcommunity.com/Companies/196/201.html',   // HR
    'https://www.bizcommunity.com/Companies/196/1.html',     // Advertising
  ],
  yellowpages: (kw, p) => `https://www.yellowpages.co.za/search/?q=${encodeURIComponent(kw)}&p=${p}`,
  businesslist: (kw, p) => `https://businesslist.co.za/search/${encodeURIComponent(kw.replace(/\s+/g,'-'))}/?page=${p}`,
  brabys: (kw, loc, p) => `https://www.brabys.com/search/?q=${encodeURIComponent(kw+' '+loc)}&page=${p}`,
  sapeople: (kw) => `https://www.sapeople.com/search/?q=${encodeURIComponent(kw)}`,
  truelocal: (kw) => `https://www.truelocal.co.za/search?q=${encodeURIComponent(kw)}`,
  // Real Estate specific
  property24agents: [
    'https://www.property24.com/real-estate-agents/south-africa',
    'https://www.property24.com/real-estate-agents/johannesburg/c2',
    'https://www.property24.com/real-estate-agents/cape-town/c8',
    'https://www.property24.com/real-estate-agents/durban/c5',
  ],
  privateproperty: [
    'https://www.privateproperty.co.za/estate-agents',
    'https://www.privateproperty.co.za/estate-agents?location=johannesburg',
    'https://www.privateproperty.co.za/estate-agents?location=cape-town',
  ],
};

async function run() {
  const KEYWORDS = process.argv[2] || 'Real Estate';
  const LOCATION = process.argv[3] || 'South Africa';
  const TARGET = 100;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   LeadGen X — SA Directory Harvester v2     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Keywords : ${KEYWORDS}`);
  console.log(`  Location : ${LOCATION}`);
  console.log(`  Target   : ${TARGET}+ leads\n`);

  const found = new Set();
  const log = (e) => { if (!found.has(e)) { found.add(e); process.stdout.write(`  [+] ${e}\n`); } };

  // ── Phase 0: Real Estate Agent Directories ────────────────────────────────
  console.log('▶ Phase 0 — Property24 & PrivateProperty agent listings...');
  const reAgentUrls = [...DIRS.property24agents, ...DIRS.privateproperty];
  for (const url of reAgentUrls) {
    const html = await fetch(url);
    extractEmails(html).forEach(log);
    const contacts = await crawlContactLinks(html, 10);
    contacts.forEach(log);
    await sleep(800);
  }
  console.log(`  → ${found.size} leads so far\n`);

  // ── Phase 1: Bizcommunity ─────────────────────────────────────────────────
  console.log('▶ Phase 1 — Bizcommunity.com...');
  for (const url of DIRS.bizcommunity) {
    const html = await fetch(url);
    extractEmails(html).forEach(log);
    const contacts = await crawlContactLinks(html, 6);
    contacts.forEach(log);
    await sleep(800);
  }
  console.log(`  → ${found.size} leads so far\n`);

  // ── Phase 2: YellowPages ZA ───────────────────────────────────────────────
  console.log('▶ Phase 2 — YellowPages.co.za...');
  for (let p = 1; p <= 5 && found.size < TARGET; p++) {
    const html = await fetch(DIRS.yellowpages(KEYWORDS, p));
    extractEmails(html).forEach(log);
    const contacts = await crawlContactLinks(html, 5);
    contacts.forEach(log);
    await sleep(700);
  }
  console.log(`  → ${found.size} leads so far\n`);

  // ── Phase 3: BusinessList ZA ──────────────────────────────────────────────
  console.log('▶ Phase 3 — BusinessList.co.za...');
  for (let p = 1; p <= 5 && found.size < TARGET; p++) {
    const html = await fetch(DIRS.businesslist(KEYWORDS, p));
    extractEmails(html).forEach(log);
    const contacts = await crawlContactLinks(html, 5);
    contacts.forEach(log);
    await sleep(700);
  }
  console.log(`  → ${found.size} leads so far\n`);

  // ── Phase 4: Brabys ───────────────────────────────────────────────────────
  console.log('▶ Phase 4 — Brabys.com...');
  for (let p = 1; p <= 4 && found.size < TARGET; p++) {
    const html = await fetch(DIRS.brabys(KEYWORDS, LOCATION, p));
    extractEmails(html).forEach(log);
    await sleep(600);
  }
  console.log(`  → ${found.size} leads so far\n`);

  // ── Phase 5: Province Sweep ───────────────────────────────────────────────
  console.log('▶ Phase 5 — Province Sweep...');
  const cities = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Polokwane'];
  for (const city of cities) {
    if (found.size >= TARGET) break;
    const [a, b] = await Promise.all([
      fetch(DIRS.yellowpages(`${KEYWORDS} ${city}`, 1)),
      fetch(DIRS.businesslist(`${KEYWORDS} ${city}`, 1)),
    ]);
    extractEmails(a + b).forEach(log);
    await sleep(600);
  }
  console.log(`  → ${found.size} leads so far\n`);

  // ── Phase 6: SA People & TrueLocal ───────────────────────────────────────
  if (found.size < TARGET) {
    console.log('▶ Phase 6 — SA People & TrueLocal...');
    const [a, b] = await Promise.all([
      fetch(DIRS.sapeople(KEYWORDS)),
      fetch(DIRS.truelocal(KEYWORDS)),
    ]);
    extractEmails(a + b).forEach(log);
    console.log(`  → ${found.size} leads so far\n`);
  }

  // ── Final Report ──────────────────────────────────────────────────────────
  const all = [...found];
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  HARVEST COMPLETE — ${String(all.length).padEnd(3)} VERIFIED LEADS      ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
  all.forEach((e, i) => console.log(`${String(i+1).padStart(3)}. ${e}`));
}

run().catch(console.error);
