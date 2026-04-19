import { NextResponse } from 'next/server';
// @ts-expect-error google-it might not have types
import googleIt from 'google-it';
import { search as googleSearch, OrganicResult } from 'google-sr';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function verifyEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    // Add a race to prevent hanging on slow DNS servers
    const timeout = new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 2000));
    const resolution = dns.resolveMx(domain).then(mx => mx && mx.length > 0);
    return await Promise.race([resolution, timeout]);
  } catch (e) {
    return false;
  }
}

async function fetchGoogleSR(query: string) {
  try {
    const results = await googleSearch({ 
       query,
       parsers: [OrganicResult],
       noPartialResults: true
    });
    return results.map(r => `${r.title} ${r.description}`).join(" ");
  } catch (e) {
    console.error("Google-SR Blocked or Failed:", e instanceof Error ? e.message : e);
    return "";
  }
}

async function fetchGoogleIt(query: string) {
  try {
    const results = await googleIt({ query, limit: 30 });
    return results.map((item: any) => `${item.title} ${item.snippet}`).join(" ");
  } catch (e) {
    return "";
  }
}

async function fetchYahoo(query: string) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 5000 });
    const $ = cheerio.load(res.data);
    return $('body').text();
  } catch (e) {
    return "";
  }
}

async function fetchBing(query: string) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 5000 });
    const $ = cheerio.load(res.data);
    return $('body').text();
  } catch (e) {
    return "";
  }
}

async function fetchGithubCommits(keywords: string, providers: string[], page: number) {
  try {
    const q = encodeURIComponent(`${keywords}`);
    const res = await axios.get(`https://api.github.com/search/commits?q=${q}&per_page=100&page=${page}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NodeJS/Email-Extractor-App'
      },
      timeout: 8000
    });

    const emails = new Set<string>();
    res.data.items.forEach((item: any) => {
      if (item.commit && item.commit.author && item.commit.author.email) {
        const email = item.commit.author.email.toLowerCase();
        const isAllowed = providers.some(p => email.includes(p.replace(/"/g, '')));
        if (isAllowed && isEmailGenuine(email)) {
          emails.add(email);
        }
      }
    });
    return Array.from(emails);
  } catch(e: any) {
    return [];
  }
}

async function fetchDDGSearch(query: string) {
  try {
    const response = await axios.post('https://html.duckduckgo.com/html/', `q=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': getRandomUA()
      },
      timeout: 5000
    });
    const $ = cheerio.load(response.data);
    return $('body').text();
  } catch (error) {
    return "";
  }
}

function isEmailGenuine(email: string) {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const username = parts[0];
  if (username.length < 3) return false;
  
  // Don't filter out business basics like 'info' or 'contact' as they are prime leads
  const garbageWords = [
    'noreply', 'no-reply', 'test', 'demo', 'fake', 'error', 
    'github', 'sentry', 'security', 'placeholder', 'example',
    'notification', 'mailer-daemon', 'postmaster'
  ];
  if (garbageWords.some(w => username.includes(w))) return false;
  
  if (/^\d+$/.test(username)) return false;
  if (/^[a-f0-9]{10,}$/.test(username)) return false;
  return true;
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

async function fetchWebsiteContent(url: string) {
  try {
    const res = await axios.get(url, { 
      headers: { 'User-Agent': getRandomUA() },
      timeout: 5000 
    });
    return res.data;
  } catch (e) {
    return "";
  }
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log("POST /api/extract - ULTIMATE ENGINE TRIGGERED");
  try {
    const rawBody = await req.text();
    if (!rawBody) return NextResponse.json({ success: false, error: 'Empty request' }, { status: 400 });
    
    let body;
    try { body = JSON.parse(rawBody); } catch (e) { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const { keywords, location, source, emailProviders, allowCompanyDomain, page = 1 } = body;
    const isGenericSearch = allowCompanyDomain === true || (!emailProviders || emailProviders.length === 0);
    const providerQuery = isGenericSearch ? "" : emailProviders.map((p: string) => `"${p}"`).join(' OR ');

    const fetches = [];
    
    // -- STAGE 1: SEARCH ENGINE DISCOVERY --
    // We mix multiple queries to increase success chance if blocked
    const searchTasks = [
      `site:linkedin.com/in "${keywords}" ${location} ${providerQuery}`,
      `site:facebook.com "${keywords}" ${location} "email" ${providerQuery}`,
      `"${keywords}" ${location} "contact" ${providerQuery}`,
      `"${keywords}" ${location} business directory`,
    ];

    // Parallel search across different engines and tasks
    fetches.push(fetchGoogleSR(searchTasks[0]).catch(() => ""));
    fetches.push(fetchGoogleSR(searchTasks[2]).catch(() => ""));
    fetches.push(fetchGoogleIt(searchTasks[1]).catch(() => ""));
    
    fetches.push(fetchYahoo(searchTasks[0]).catch(() => ""));
    fetches.push(fetchBing(searchTasks[2]).catch(() => ""));
    fetches.push(fetchDDGSearch(searchTasks[3]).catch(() => ""));

    // -- STAGE 2: GITHUB API --
    fetches.push(fetchGithubCommits(`${keywords} ${location}`, isGenericSearch ? ["@"] : emailProviders, 1).then(a => a.join(" ")));

    // -- STAGE 3: INDUSTRY EXPLORATION (Optional/Slow) --
    if (page === 1) {
      fetches.push(fetchWebsiteContent(`https://www.google.com/search?q=${encodeURIComponent(keywords + " " + location + " official website")}`).catch(() => ""));
    }

    const textResults = await Promise.all(fetches);
    const combinedText = textResults.join(" ");

    const effectiveProviders = isGenericSearch ? ["@"] : emailProviders;
    let extractedEmails = extractEmailsFromText(combinedText, effectiveProviders);
    extractedEmails = Array.from(new Set(extractedEmails));

    console.log(`Engine found ${extractedEmails.length} candidates. Verifying...`);
    
    // Parallel verification with a global safety limit to prevent timeout
    const verificationResults = await Promise.all(
      extractedEmails.slice(0, 150).map(async (email) => {
        const isValid = await verifyEmailDomain(email);
        return isValid ? email : null;
      })
    );

    const verifiedEmails = verificationResults.filter((e): e is string => e !== null);
    console.log(`SUCCESS: Found ${verifiedEmails.length} verified leads.`);

    return NextResponse.json({ 
        success: true, 
        emails: verifiedEmails,
        count: verifiedEmails.length,
        query: `${keywords} ${location ? location : ''}`.trim()
    });

  } catch (error) {
    console.error('Engine Crash:', error);
    return NextResponse.json({ success: false, error: 'Engine error' }, { status: 500 });
  }
}






