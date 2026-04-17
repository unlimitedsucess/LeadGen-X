import { NextResponse } from 'next/server';
// @ts-ignore
import googleIt from 'google-it';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'dns/promises';

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

export async function POST(req: Request) {
  try {
    const { keywords, location, source, emailProviders, page = 1 } = await req.json();
    const providerQuery = emailProviders.map((provider: string) => `"${provider}"`).join(' OR ');

    console.log("Starting massive multi-engine extraction. Source:", source);

    const professionalKeywords = ["developer", "manager", "engineer", "sales", "expert", "consultant", "director", "owner", "partner"];
    const allKeywords = [keywords, ...professionalKeywords.map(pw => keywords + " " + pw)];

    const fetches = [];
    
    // 1. PRIMARY SEARCH ENGINE: Google (Best Quality)
    fetches.push(fetchGoogle(`site:linkedin.com/in "${keywords}" ${location} ${providerQuery}`));
    
    // 2. SOCIAL MEDIA / NICHE ENGINES
    const sites = source === 'linkedin' 
      ? ['site:linkedin.com/in', 'site:linkedin.com/pub'] 
      : source === 'github' 
        ? ['site:github.com'] 
        : ['site:linkedin.com/in', 'site:facebook.com', 'site:twitter.com'];

    for (const site of sites) {
      const keywordToUse = allKeywords[Math.floor(Math.random() * allKeywords.length)];
      const q = `${site} "${keywordToUse}" ${location} (${providerQuery})`;
      fetches.push(fetchDDGSearch(q));
      fetches.push(fetchYahoo(q));
      fetches.push(fetchBing(q));
    }

    // 3. GITHUB API (If applicable or as fallback)
    fetches.push(fetchGithubCommits(`${keywords} ${location}`, emailProviders, page).then(arr => arr.join(" ")));
    fetches.push(fetchGithubCommits(`${allKeywords[1]} ${location}`, emailProviders, page).then(arr => arr.join(" ")));

    // 4. GENERAL WEB SCRAPING
    fetches.push(fetchDDGSearch(`"contact email" ${keywords} ${location} (${providerQuery})`));
    fetches.push(fetchYahoo(`"${keywords}" ${location} email list "gmail.com"`));

    const textResults = await Promise.all(fetches);
    const combinedText = textResults.join(" ");

    let extractedEmails = extractEmailsFromText(combinedText, emailProviders);
    extractedEmails = Array.from(new Set(extractedEmails));

    console.log(`Verifying ${extractedEmails.length} unique emails found...`);
    
    const verificationResults = await Promise.all(
      extractedEmails.map(async (email) => {
        const isValid = await verifyEmailDomain(email);
        return isValid ? email : null;
      })
    );

    const verifiedEmails = verificationResults.filter((e): e is string => e !== null);
    console.log(`Extraction complete. Found ${verifiedEmails.length} verified leads.`);

    return NextResponse.json({ 
        success: true, 
        emails: verifiedEmails,
        count: verifiedEmails.length,
        query: `${keywords} ${location ? location : ''}`.trim()
    });

  } catch (error) {
    console.error('Unified Extraction Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}


