const dns = require('node:dns/promises');

async function test() {
  const domains = ['gmail.com', 'outlook.com', 'nonexistent-domain-12345.com'];
  for (const domain of domains) {
    try {
      const mx = await dns.resolveMx(domain);
      console.log(`${domain}:`, mx.length > 0 ? 'HAS MX' : 'NO MX');
    } catch (e) {
      console.log(`${domain}: FAILED - ${e.message}`);
    }
  }
}

test();
