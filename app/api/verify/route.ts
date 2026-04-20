import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';

function isEmailGenuine(email: string) {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const username = parts[0];
  if (username.length < 3) return false;
  
  const garbageWords = [
    'noreply', 'no-reply', 'test', 'demo', 'fake', 'error', 
    'github', 'sentry', 'security', 'placeholder', 'example',
    'notification', 'mailer-daemon', 'postmaster', 'abuse', 'spam'
  ];
  if (garbageWords.some(w => username.includes(w))) return false;
  
  if (/^\d+$/.test(username)) return false;
  if (/^[a-f0-9]{10,}$/.test(username)) return false;
  return true;
}

async function verifyEmailDomain(email: string): Promise<boolean> {
  if (!isEmailGenuine(email)) return false;

  const domain = email.split('@')[1];
  if (!domain) return false;
  
  try {
    // Increase timeout slightly and try multiple ways
    const timeout = new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 3000));
    const resolution = dns.resolveMx(domain).then(mx => mx && mx.length > 0);
    
    return await Promise.race([resolution, timeout]);
  } catch (e) {
    // Fallback to A record if MX fails (rare but some small servers rely on it)
    try {
      const aRecord = await dns.resolve(domain);
      return aRecord && aRecord.length > 0;
    } catch (err) {
      return false;
    }
  }
}

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ success: false, error: 'Invalid emails list' }, { status:400 });
    }

    // Process in batches or parallel with limit if needed, but for now parallel
    const verifiedResults = await Promise.all(
      emails.map(async (email) => {
        const isValid = await verifyEmailDomain(email);
        return { email, isValid };
      })
    );

    return NextResponse.json({ success: true, results: verifiedResults });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
