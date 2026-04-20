import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

function isEmailGenuine(email: string) {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [username, domain] = parts;
  const userLower = username.toLowerCase();
  const domainLower = domain.toLowerCase();

  if (username.length < 2 || !domain.includes('.')) return false;
  
  // High-Level Gibberish & Smash Detection
  const hasRepetitive = (str: string) => {
    if (/(.)\1{2,}/.test(str)) return true; // repetitive chars like "aaa"
    for (let i = 0; i <= str.length - 4; i++) {
      const chunk = str.substring(i, i + 2);
      if (str.substring(i + 2).includes(chunk)) return true; // repetitive pairs like "gygy"
    }
    return false;
  };

  const isBigProvider = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'].includes(domainLower);
  
  if (isBigProvider) {
    if (hasRepetitive(userLower)) return false;
    
    const vowels = userLower.match(/[aeiouy]/gi);
    const vCount = vowels ? vowels.length : 0;
    const vRatio = vCount / userLower.length;
    
    // Catch vowel-heavy junk (tteuueu) and consonant clusters (gyg)
    if (userLower.length > 5 && (vRatio < 0.20 || vRatio > 0.65)) return false;
    if (userLower.length <= 5 && (vRatio === 0 || vRatio === 1)) return false;
    if (/[bcdfghjklmnpqrstvwxz]{4,}/i.test(userLower)) return false;
  }

  const garbageWords = [
    'noreply', 'no-reply', 'test', 'demo', 'fake', 'error', 
    'github', 'sentry', 'security', 'placeholder', 'example',
    'notification', 'mailer-daemon', 'postmaster', 'abuse', 'spam',
    'support', 'admin', 'root', 'asdf', 'qwerty', '12345', 'zxcv'
  ];
  if (garbageWords.some(w => userLower.includes(w))) return false;
  
  if (/^\d{5,}$/.test(username)) return false; // all digits
  if (/^[a-f0-9]{10,}$/i.test(username)) return false; // hexadecimal
  if (username.length > 50) return false;

  const disposable = ['tempmail.com', 'throwawaymail.com', '10minutemail.com', 'mailinator.com', 'guerrillamail.com'];
  if (disposable.some(d => domainLower === d)) return false;

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
        socket.write(`HELO industrial-verify.com\r\n`);
        step = 1;
      } else if (step === 1 && resp.includes('250')) {
        socket.write(`MAIL FROM:<verify@industrial-verify.com>\r\n`);
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
    return await probeSmtp(email, priorityMx);
  } catch (e) {
    try {
      const a = await dns.resolve(domain, 'A');
      return a && a.length > 0;
    } catch (err) {
      return false;
    }
  }
}

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();
    if (!emails || !Array.isArray(emails)) return NextResponse.json({ success: false }, { status:400 });
    
    const verifiedResults = [];
    const batchSize = 10;
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (email) => {
        const isValid = await verifyEmailDomain(email);
        return { email, isValid };
      }));
      verifiedResults.push(...results);
    }

    return NextResponse.json({ success: true, results: verifiedResults });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
