import { NextResponse } from 'next/server';
// @ts-expect-error google-it might not have types
import googleIt from 'google-it';
import { search as googleSearch, OrganicResult } from 'google-sr';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';
import net from 'node:net';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(defaultValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
}

function isEmailGenuine(email: string) {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [username, domain] = parts;
  const userLower = username.toLowerCase();
  const domainLower = domain.toLowerCase();

  if (username.length < 2 || !domain.includes('.')) return false;
  
  const hasRepetitive = (str: string) => {
    if (/(.)\1{2,}/.test(str)) return true;
    for (let i = 0; i <= str.length - 4; i++) {
      const chunk = str.substring(i, i + 2);
      if (str.substring(i + 2).includes(chunk)) return true;
    }
    return false;
  };

  const isBigProvider = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com'].includes(domainLower);
  
  if (isBigProvider) {
    if (hasRepetitive(userLower)) return false;
    const vowels = userLower.match(/[aeiouy]/gi);
    const vRatio = vowels ? (vowels.length / userLower.length) : 0;
    
    if (userLower.length > 5 && (vRatio < 0.20 || vRatio > 0.65)) return false;
    if (userLower.length <= 5 && (vRatio === 0 || vRatio === 1)) return false;
    if (/[bcdfghjklmnpqrstvwxz]{4,}/i.test(userLower)) return false;
  }

  const garbageWords = ['noreply', 'no-reply', 'test', 'demo', 'fake', 'error', 'asdf', 'qwerty'];
  if (garbageWords.some(w => userLower.includes(w))) return false;
  if (/^\d{5,}$/.test(username)) return false;
  if (/^[a-f0-9]{10,}$/i.test(username)) return false;

  return true;
}

async function probeSmtp(email: string, mx: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mx);
    socket.setTimeout(2500);
    let step = 0;
    socket.on('data', (data) => {
      const resp = data.toString();
      if (step === 0 && resp.includes('220')) {
        socket.write(`HELO lead-verify.com\r\n`);
        step = 1;
      } else if (step === 1 && resp.includes('250')) {
        socket.write(`MAIL FROM:<check@lead-verify.com>\r\n`);
        step = 2;
      } else if (step === 2 && resp.includes('250')) {
        socket.write(`RCPT TO:<${email}>\r\n`);
        step = 3;
      } else if (step === 3) {
        socket.end();
        resolve(resp.includes('250'));
      }
    });
    socket.on('error', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(true); });
  });
}

async function verifyEmailDomain(email: string): Promise<boolean> {
  if (!isEmailGenuine(email)) return false;
  const domain = email.split('@')[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) return false;
    const priorityMx = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;
    return await withTimeout(probeSmtp(email, priorityMx), 4000, true);
  } catch (e) {
    try {
      const a = await dns.resolve(domain, 'A');
      return a && a.length > 0;
    } catch { return false; }
  }
}

async function fetchGoogleSR(query: string, page = 0) {
  try {
    const results = await googleSearch({ 
       query: `${query}${page > 0 ? ' page ' + (page + 1) : ''}`,
       parsers: [OrganicResult],
       noPartialResults: true
    });
    return results.map(r => `${r.title} ${r.description} ${r.link}`).join(" ");
  } catch (e) { return ""; }
}

async function fetchGoogleIt(query: string, page = 0) {
  try {
    const results = await googleIt({ query, limit: 50, start: page * 50 });
    return results.map((item: any) => `${item.title} ${item.snippet} ${item.link}`).join(" ");
  } catch (e) { return ""; }
}

async function fetchYahoo(query: string, page = 0) {
  try {
    const start = page * 10 + 1;
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${start}`;
    const res = await axios.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 5000 });
    const $ = cheerio.load(res.data);
    return $('body').text();
  } catch (e) { return ""; }
}

async function fetchBing(query: string, page = 0) {
  try {
    const first = page * 10 + 1;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`;
    const res = await axios.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 5000 });
    const $ = cheerio.load(res.data);
    return $('body').text();
  } catch (e) { return ""; }
}

async function fetchGithubCommits(keywords: string, providers: string[], page: number) {
  try {
    const q = encodeURIComponent(`${keywords}`);
    const res = await axios.get(`https://api.github.com/search/commits?q=${q}&per_page=100&page=${page}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'NodeJS/Email-Extractor' },
      timeout: 8000
    });
    const emails = new Set<string>();
    res.data.items?.forEach((item: any) => {
      if (item.commit?.author?.email) {
        const email = item.commit.author.email.toLowerCase();
        const isAllowed = providers.some(p => email.includes(p.replace(/"/g, '')));
        if (isAllowed && isEmailGenuine(email)) emails.add(email);
      }
    });
    return Array.from(emails);
  } catch(e) { return []; }
}

async function fetchDDGSearch(query: string) {
  try {
    const response = await axios.post('https://html.duckduckgo.com/html/', `q=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': getRandomUA() },
      timeout: 5000
    });
    const $ = cheerio.load(response.data);
    return $('body').text();
  } catch (error) { return ""; }
}

function extractEmailsFromText(text: string, providers: string[]) {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const emails = new Set<string>();
  const matches = text.match(emailRegex) || [];
  matches.forEach(m => {
    const lower = m.toLowerCase();
    const isAllowedProvider = providers.some(p => lower.includes(p.replace(/"/g, '')));
    if (!isAllowedProvider) return;
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif') || lower.endsWith('.svg')) return;
    if (isEmailGenuine(lower)) emails.add(lower);
  });
  return Array.from(emails);
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log("POST /api/extract - DEEP VERIFY ENABLED");
  try {
    const body = await req.json();
    const { keywords, location, emailProviders, allowCompanyDomain, page = 1, turbo = false } = body;
    
    const isGenericSearch = allowCompanyDomain === true || (!emailProviders || emailProviders.length === 0);
    const providerQuery = isGenericSearch ? "" : emailProviders.map((p: string) => `"${p}"`).join(' OR ');

    let keywordList = [keywords || "business leads South Africa"];
    if (turbo) {
      keywordList = [keywords, `${keywords} services`, `${keywords} company`, `best ${keywords} South Africa`];
    }

    const textResults: string[] = [];
    const pagesPerKeyword = turbo ? 2 : 1;

    for (const kw of keywordList) {
      const searchTasks = [
        `site:linkedin.com/in "${kw}" ${location} ${providerQuery}`,
        `site:yellowpages.co.za "${kw}"`,
        `site:findsa.co.za "${kw}"`,
        `"${kw}" ${location} "contact" ${providerQuery}`,
        `"${kw}" ${location} "email" ${providerQuery}`
      ];

      for (let pIdx = 0; pIdx < pagesPerKeyword; pIdx++) {
        const offset = (page - 1) * pagesPerKeyword + pIdx;
        const fetchers = [
          () => fetchGoogleSR(searchTasks[0], offset),
          () => fetchGoogleIt(searchTasks[3], offset),
          () => fetchYahoo(searchTasks[4], offset),
          () => fetchBing(searchTasks[0], offset),
          () => fetchDDGSearch(searchTasks[1]),
          () => fetchDDGSearch(searchTasks[2])
        ];

        const results = await Promise.all(fetchers.map(f => withTimeout(f(), 10000, "")));
        textResults.push(...results);
      }
      const gitEmails = await withTimeout(fetchGithubCommits(`${kw} ${location}`, isGenericSearch ? ["@"] : emailProviders, page), 8000, []);
      textResults.push(gitEmails.join(" "));
    }

    const combinedText = textResults.join(" ");
    const effectiveProviders = isGenericSearch ? ["@"] : emailProviders;
    let candidates = Array.from(new Set(extractEmailsFromText(combinedText, effectiveProviders)));

    console.log(`Deep Extraction found ${candidates.length} candidates. Starting SMTP-enabled verification...`);

    const verifiedEmails: string[] = [];
    const batchSize = 15;
    const maxToVerify = turbo ? 300 : 150; 
    const toProcess = candidates.slice(0, maxToVerify);

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (email) => {
        try {
          const isValid = await verifyEmailDomain(email);
          return isValid ? email : null;
        } catch { return null; }
      }));
      results.forEach(e => { if (e) verifiedEmails.push(e); });
      if (!turbo && verifiedEmails.length >= 100) break;
    }

    return NextResponse.json({ success: true, emails: verifiedEmails, count: verifiedEmails.length, query: keywords });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
