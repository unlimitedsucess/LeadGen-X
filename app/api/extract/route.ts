import { NextResponse } from 'next/server';
// @ts-expect-error google-it might not have types
import googleIt from 'google-it';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';

console.log("EXTRACT ROUTE LOADED");

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function verifyEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return mx && mx.length > 0;
  } catch (e) {
    return false;
  }
}

async function fetchGoogle(query: string) {
  try {
    const results = await googleIt({ query, limit: 50 });
    let combined = "";
    results.forEach((item: any) => {
      combined += ` ${item.title} ${item.snippet}`;
    });
    return combined;
  } catch (e) {
    return "";
  }
}

async function fetchYahoo(query: string) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
    const $ = cheerio.load(res.data);
    return $('body').text();
  } catch (e) {
    return "";
  }
}

async function fetchBing(query: string) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
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
      }
    });

    const emails = new Set<string>();
    res.data.items.forEach((item: any) => {
      if (item.commit && item.commit.author && item.commit.author.email) {
        let email = item.commit.author.email.toLowerCase();
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
        'User-Agent': USER_AGENT
      }
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
  if (username.includes('+')) return false;
  const botWords = ['noreply', 'no-reply', 'test', 'demo', 'fake', 'error', 'admin', 'info', 'support', 'contact', 'hello', 'github', 'sentry', 'security'];
  if (botWords.some(w => username.includes(w))) return false;
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
    if (lower.includes('sentry') || lower.includes('example.com') || lower.includes('placeholder')) return;
    if (isEmailGenuine(lower)) emails.add(lower);
  });
  return Array.from(emails);
}

async function fetchWebsiteContent(url: string) {
  try {
    const res = await axios.get(url, { 
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000 // Short timeout to keep things fast
    });
    return res.data;
  } catch (e) {
    return "";
  }
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log("POST /api/extract - START");
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    }
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    console.log("POST /api/extract - BODY PARSED", Object.keys(body));
    const { keywords, location, source, emailProviders, allowCompanyDomain, page = 1 } = body;
    
    const isGenericSearch = allowCompanyDomain === true || (!emailProviders || emailProviders.length === 0);
    const providerQuery = isGenericSearch ? "" : emailProviders.map((provider: string) => `"${provider}"`).join(' OR ');

    console.log("Starting ULTIMATE ENGINE. Keywords:", keywords, "Loc:", location);

    const fetches = [];
    
    // -- STAGE 1: SEARCH ENGINE DISCOVERY (DEEP) --
    const searchTasks = [
      `site:linkedin.com/in "${keywords}" ${location} ${providerQuery}`,
      `site:facebook.com "${keywords}" ${location} "email" ${providerQuery}`,
      `site:instagram.com "${keywords}" ${location} "contact" ${providerQuery}`,
      `"${keywords}" ${location} "official website"`,
      `"${keywords}" ${location} company directory email`,
      `"${keywords}" ${location} list of business emails`
    ];

    // Recursive depth: 3 pages for main queries
    for (let i = 0; i < 3; i++) {
      const offset = i * 10;
      
      // Google Fallback Logic
      fetches.push(fetchGoogle(searchTasks[0]).catch(() => ""));
      fetches.push(fetchGoogle(searchTasks[3]).catch(() => ""));

      // Direct Scraping (Yahoo/Bing/DDG)
      const qMix = searchTasks[i % searchTasks.length];
      fetches.push(fetchYahoo(`${qMix}&b=${offset + 1}`).catch(() => ""));
      fetches.push(fetchBing(`${qMix}&first=${offset + 1}`).catch(() => ""));
      fetches.push(fetchDDGSearch(qMix).catch(() => ""));
    }

    // -- STAGE 2: GITHUB PRIMARY DATA --
    fetches.push(fetchGithubCommits(`${keywords} ${location}`, emailProviders.length ? emailProviders : ["@"], 1).then(a => a.join(" ")));
    fetches.push(fetchGithubCommits(`${keywords}`, emailProviders.length ? emailProviders : ["@"], 2).then(a => a.join(" ")));

    // -- STAGE 3: LIVE WEBSITE CRAWLING (For verified business info) --
    // We try to scrape the first 5 websites that look like official company pages
    try {
      const discoveryResults = await googleIt({ query: `"${keywords}" ${location} website`, limit: 10 }).catch(() => []);
      const links = discoveryResults.map((r: any) => r.link).filter((l: string) => l && l.startsWith('http'));
      
      links.slice(0, 5).forEach((url: string) => {
        fetches.push(fetchWebsiteContent(url).then(async content => {
          if (content && content.includes('contact')) {
             return content + " " + (await fetchWebsiteContent(url + "/contact").catch(() => ""));
          }
          return content;
        }));
      });
    } catch (e) {
      console.log("Skipping dynamic crawl due to engine block");
    }

    const textResults = await Promise.all(fetches);
    const combinedText = textResults.join(" ");

    // -- STAGE 4: EXTRACTION & VERIFICATION --
    const effectiveProviders = isGenericSearch ? ["@"] : emailProviders;
    let extractedEmails = extractEmailsFromText(combinedText, effectiveProviders);
    extractedEmails = Array.from(new Set(extractedEmails));

    console.log(`Ultimate Engine found ${extractedEmails.length} candidates. Verifying...`);
    
    const verificationResults = await Promise.all(
      extractedEmails.map(async (email) => {
        const isValid = await verifyEmailDomain(email);
        return isValid ? email : null;
      })
    );

    const verifiedEmails = verificationResults.filter((e): e is string => e !== null);
    console.log(`SUCCESS: ${verifiedEmails.length} verified leads found.`);

    return NextResponse.json({ 
        success: true, 
        emails: verifiedEmails,
        count: verifiedEmails.length,
        query: `${keywords} ${location ? location : ''}`.trim()
    });

  } catch (error) {
    console.error('Ultimate Engine Crash:', error);
    return NextResponse.json({ success: false, error: 'Engine error' }, { status: 500 });
  }
}





