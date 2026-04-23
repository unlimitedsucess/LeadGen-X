import { NextResponse } from 'next/server';
import type { Browser, Page } from 'puppeteer';
import dns from 'node:dns/promises';
import net from 'node:net';

// ─── Config ───────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function withTimeout<T>(p: Promise<T>, ms: number, fb: T): Promise<T> {
  let t: NodeJS.Timeout;
  const tp = new Promise<T>(res => { t = setTimeout(() => res(fb), ms); });
  return Promise.race([p, tp]).finally(() => clearTimeout(t));
}

// ─── Email Validation ─────────────────────────────────────────────────────────

const JUNK = ['noreply','no-reply','mailer','bounce','test','demo','example','sample','placeholder','sentry','webpack','localhost'];

function isGenuine(email: string): boolean {
  if (!email || email.length < 7) return false;
  const [u, d] = email.split('@');
  if (!u || !d || !d.includes('.')) return false;
  if (JUNK.some(j => email.includes(j))) return false;
  if (/^\d{5,}$/.test(u)) return false;
  if (/^[a-f0-9]{12,}$/i.test(u)) return false;
  if (/\.(png|jpg|gif|svg|webp|js|css|woff)$/i.test(email)) return false;
  const tld = d.split('.').pop() || '';
  return tld.length >= 2 && tld.length <= 10;
}

// ─── SMTP Verification ────────────────────────────────────────────────────────

async function probeSmtp(email: string, mx: string): Promise<boolean> {
  return new Promise(resolve => {
    const s = net.createConnection(25, mx);
    s.setTimeout(3000);
    let step = 0;
    s.on('data', d => {
      const r = d.toString();
      if (step === 0 && r.startsWith('220')) { s.write('HELO verify.com\r\n'); step = 1; }
      else if (step === 1 && r.includes('250')) { s.write('MAIL FROM:<v@verify.com>\r\n'); step = 2; }
      else if (step === 2 && r.includes('250')) { s.write(`RCPT TO:<${email}>\r\n`); step = 3; }
      else if (step === 3) { s.end(); resolve(r.includes('250')); }
    });
    s.on('error', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(true); });
  });
}

async function verifyEmail(email: string): Promise<boolean> {
  if (!isGenuine(email)) return false;
  const domain = email.split('@')[1];
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx?.length) return false;
    const best = mx.sort((a, b) => a.priority - b.priority)[0].exchange;
    return await withTimeout(probeSmtp(email, best), 4000, true);
  } catch {
    try { return (await dns.resolve(domain, 'A')).length > 0; }
    catch { return false; }
  }
}

// ─── Puppeteer Helpers ────────────────────────────────────────────────────────

async function makeBrowser(): Promise<Browser> {
  const isLocal = !process.env.VERCEL_ENV && !process.env.VERCEL && process.env.NODE_ENV !== 'production';
  // Use a unique user data dir to avoid EBUSY lockfile issues on Windows
  const uniqueId = `profile-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  if (isLocal) {
    const puppeteer = require('puppeteer');
    const path = require('path');
    const os = require('os');
    const userDataDir = path.join(os.tmpdir(), `puppeteer_${uniqueId}`);

    return puppeteer.launch({
      headless: true,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
  } else {
    const puppeteerCore = require('puppeteer-core');
    const chromium = require('@sparticuz/chromium');
    
    return puppeteerCore.launch({
      args: [...chromium.args, '--disable-blink-features=AutomationControlled'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
}

async function openPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1366, height: 768 });
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image','font','media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  return page;
}

// Extract all emails from a rendered page
async function extractFromPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const emails = new Set<string>();
    const rx = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10})/gi;

    (document.body?.innerText?.match(rx) || []).forEach((e: string) => emails.add(e.toLowerCase()));

    document.querySelectorAll('a[href^="mailto:"]').forEach((el: Element) => {
      const href = (el as HTMLAnchorElement).getAttribute('href')!.replace('mailto:','').split('?')[0].trim();
      if (href.includes('@')) emails.add(href.toLowerCase());
    });

    (document.querySelectorAll('[data-email],[data-mail]') as NodeListOf<HTMLElement>).forEach(el => {
      const e = el.dataset.email || el.dataset.mail || '';
      if (e.includes('@')) emails.add(e.toLowerCase());
    });

    const html = document.documentElement.innerHTML
      .replace(/&#64;/g,'@').replace(/&#46;/g,'.').replace(/\[at\]/gi,'@').replace(/\[dot\]/gi,'.');
    (html.match(rx) || []).forEach((e: string) => emails.add(e.toLowerCase()));

    return [...emails];
  });
}

async function visitExtract(browser: Browser, url: string, wait = 2000): Promise<string[]> {
  const page = await openPage(browser);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(wait);
    return await extractFromPage(page);
  } catch { return []; }
  finally { await page.close(); }
}

// ─── Directory Scrapers ───────────────────────────────────────────────────────

async function scrapeYellowPages(browser: Browser, keywords: string, candidates: Set<string>, target: number) {
  const page = await openPage(browser);
  for (let p = 1; p <= 5 && candidates.size < target; p++) {
    try {
      await page.goto(`https://www.yellowpages.co.za/search/?q=${encodeURIComponent(keywords)}&p=${p}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(1500);
      const links: string[] = await page.evaluate(() =>
        [...document.querySelectorAll('.listing-name a,h2 a,h3 a')].map((a: any) => a.href).filter((h: string) => h?.startsWith('http')).slice(0,10)
      );
      (await extractFromPage(page)).filter(isGenuine).forEach(e => candidates.add(e));
      for (const link of [...new Set(links)]) {
        if (candidates.size >= target) break;
        (await visitExtract(browser, link, 1500)).filter(isGenuine).forEach(e => candidates.add(e));
        await sleep(400);
      }
    } catch { /* continue */ }
    await sleep(800);
  }
  await page.close();
}

async function scrapeCompanyDirs(browser: Browser, keywords: string, candidates: Set<string>) {
  const urls = [
    `https://www.cylex.co.za/search.html?what=${encodeURIComponent(keywords)}`,
    `https://www.hotfrog.co.za/search/south-africa/${encodeURIComponent(keywords.replace(/\s+/g,'%20'))}`,
    `https://za.kompass.com/a/search?q=${encodeURIComponent(keywords)}`,
    `https://www.brabys.com/search/?q=${encodeURIComponent(keywords + ' South Africa')}`,
  ];
  for (const url of urls) {
    const emails = await visitExtract(browser, url, 2000);
    emails.filter(isGenuine).forEach(e => candidates.add(e));
    await sleep(600);
  }
}

async function provinceSweep(browser: Browser, keywords: string, candidates: Set<string>, target: number) {
  const cities = ['Johannesburg','Cape Town','Durban','Pretoria','Port Elizabeth','Bloemfontein'];
  const page = await openPage(browser);
  for (const city of cities) {
    if (candidates.size >= target) break;
    try {
      await page.goto(`https://www.yellowpages.co.za/search/?q=${encodeURIComponent(keywords+' '+city)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(1200);
      (await extractFromPage(page)).filter(isGenuine).forEach(e => candidates.add(e));
    } catch { /* continue */ }
    await sleep(600);
  }
  await page.close();
}

// ─── Search Engine Scrapers (High Yield Dorking) ──────────────────────────────────

// ─── Search Engine Scrapers (High Yield Dorking) ──────────────────────────────────

function buildExpandedQueries(keywords: string, location: string, providers: string[]): string[] {
  const provs = (providers || ['gmail.com']).map(p => `"${p.includes('@') ? p : '@' + p}"`).join(' OR ');
  const baseLocation = location.toLowerCase();
  
  // High yield dorks
  const dorks = [
    `"${keywords}" "${location}" (${provs})`,
    `site:linkedin.com "${keywords}" "${location}" (${provs})`,
    `site:facebook.com "${keywords}" "${location}" (${provs})`,
    `site:instagram.com "${keywords}" "${location}" (${provs})`,
    `"${keywords}" contact email (${provs}) "${location}"`
  ];

  return dorks;
}

async function scrapeBingDorks(browser: Browser, queries: string[], candidates: Set<string>, target: number) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  for (const query of queries) {
    if (candidates.size >= target) break;
    for (let p = 0; p < 3 && candidates.size < target; p++) {
      const first = p * 10 + 1;
      try {
        await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1000);
        const found = await extractFromPage(page);
        found.filter(isGenuine).forEach(e => candidates.add(e));
      } catch { /* ignore */ }
    }
  }
  await page.close();
}

async function scrapeYahooDorks(browser: Browser, queries: string[], candidates: Set<string>, target: number) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  for (const query of queries) {
    if (candidates.size >= target) break;
    for (let p = 0; p < 3 && candidates.size < target; p++) {
      const b = p * 10 + 1;
      try {
        await page.goto(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${b}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1000);
        const found = await extractFromPage(page);
        found.filter(isGenuine).forEach(e => candidates.add(e));
      } catch { /* ignore */ }
    }
  }
  await page.close();
}

async function scrapeDDGDorks(browser: Browser, queries: string[], candidates: Set<string>, target: number) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  for (const query of queries) {
    if (candidates.size >= target) break;
    try {
      await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(1000);
      const found = await extractFromPage(page);
      found.filter(isGenuine).forEach(e => candidates.add(e));
    } catch { /* ignore */ }
  }
  await page.close();
}

// ─── Main API Handler ─────────────────────────────────────────────────────────

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minute timeout for Vercel/Next

export async function POST(req: Request) {
  console.log('\n========= LEADGEN X — PUPPETEER HARVESTER =========');
  let browser: Browser | null = null;
  try {
    const { keywords, location, emailProviders, allowCompanyDomain, turbo = false } = await req.json();
    const target = turbo ? 250 : 150;
    const candidates = new Set<string>();

    console.log(`Target: ${target} | Query: "${keywords}" in "${location}"`);
    const expandedQueries = buildExpandedQueries(keywords, location, emailProviders);
    console.log(`Generated ${expandedQueries.length} Multi-Dork Queries to bypass pagination limits.`);

    browser = await makeBrowser();

    // Parallel Search Engine Sweeping (Highest Yield & Speed)
    console.log('[Extraction] Launching Parallel Search Engines (Bing + Yahoo + DDG)...');
    
    // Define parallel scrapers
    const scrapers = [
      withTimeout(scrapeBingDorks(browser, expandedQueries, candidates, target), 60000, undefined),
      withTimeout(scrapeYahooDorks(browser, expandedQueries, candidates, target), 60000, undefined),
      withTimeout(scrapeDDGDorks(browser, expandedQueries, candidates, target), 50000, undefined)
    ];

    // Run search engines in parallel
    await Promise.all(scrapers);
    console.log(`  → After Search Engines: ${candidates.size} candidates`);

    // Only if we are still short, do the slow fallbacks
    if (candidates.size < target * 0.4) {
      console.log('[Fallback] Still low on leads, running directory fallbacks...');
      const fallbacks = [
        withTimeout(scrapeYellowPages(browser, `${keywords} ${location}`, candidates, target), 30000, undefined),
        withTimeout(scrapeCompanyDirs(browser, keywords, candidates), 30000, undefined)
      ];
      await Promise.all(fallbacks);
    }

    await browser.close();
    browser = null;

    // Verify
    console.log(`[Verification] Checking ${candidates.size} candidates...`);
    const allEmails = Array.from(candidates);
    const verified: string[] = [];
    const batch = 15;
    for (let i = 0; i < allEmails.length && verified.length < target; i += batch) {
      const results = await Promise.all(
        allEmails.slice(i, i + batch).map(async e => {
          try { return (await verifyEmail(e)) ? e : null; } catch { return null; }
        })
      );
      results.forEach(e => { if (e) verified.push(e); });
    }

    console.log(`✅ Done — ${verified.length} verified leads`);
    return NextResponse.json({ success: true, emails: verified, count: verified.length });

  } catch (err: any) {
    if (browser) { try { await browser.close(); } catch {} }
    console.error('LeadGen X Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
