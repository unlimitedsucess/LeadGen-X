import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Helper to parse Spintax like {Hello|Hi|Greetings}
function parseSpintax(text: string): string {
  return text.replace(/{([^{}]+)}/g, (match, choices) => {
    const options = choices.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
}

// Automatically adds variation to common greetings if the user hasn't used Spintax
function autoDiversify(text: string): string {
  const greetingPatterns = [
    { regex: /^(Good day|Hello|Hi|Greetings)\s*,/i, replacement: "{Good day|Hello|Hi|Greetings}," },
    { regex: /^(Best regards|Regards|Sincerely|Best)\s*,/i, replacement: "{Best regards|Regards|Sincerely|Best}," }
  ];

  let diversified = text;
  for (const { regex, replacement } of greetingPatterns) {
    if (regex.test(diversified) && !diversified.includes('{')) {
      diversified = diversified.replace(regex, replacement);
    }
  }
  return diversified;
}

async function sendViaBrevo(payload: any) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not found in environment');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`Brevo API Error [${response.status}]:`, JSON.stringify(error, null, 2));
    throw new Error(error.message || `Brevo API error (${response.status})`);
  }

  return await response.json();
}

export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    engine: 'Brevo',
    key_configured: !!process.env.BREVO_API_KEY 
  });
}

export async function POST(req: Request) {
  console.log("-----------------------------------------");
  console.log("POST /api/send - INCOMING REQUEST");
  console.log("BREVO_API_KEY status:", process.env.BREVO_API_KEY ? "CONFIGURED (Len: " + process.env.BREVO_API_KEY.length + ")" : "MISSING");
  console.log("-----------------------------------------");
  try {
    const payload = await req.json();
    let { 
      emails, 
      subject, 
      body: emailContent, 
      smtpEmail, // We'll use this as the 'from' email if provided
      replyTo,
      senderName,
      isPlainText = false
    } = payload;

    if (!emails || !emails.length) {
      return NextResponse.json({ success: false, error: 'No emails provided.' }, { status: 400 });
    }

    const total = emails.length;
    let successCount = 0;
    let failCount = 0;
    
    console.log(`Starting Brevo campaign for ${total} recipients using sender: ${smtpEmail}`);

    if (!process.env.BREVO_API_KEY) {
        console.error("CRITICAL: BREVO_API_KEY is missing from environment variables!");
    }

    for (let i = 0; i < total; i++) {
        const recipient = emails[i];
        try {
            // 1. Parse Spintax for uniqueness
            let variantSubject = parseSpintax(subject);
            let variantBody = autoDiversify(emailContent); 
            variantBody = parseSpintax(variantBody);

            // 2. Simple Personalization
            variantBody = variantBody.replace(/{{email}}/g, recipient);
            
            // 3. Generate a unique fingerprint
            const fingerprint = crypto.randomUUID().substring(0, 8);
            variantSubject = `${variantSubject} [Ref: ${fingerprint.substring(0, 4)}]`;

            // 4. Prepare Brevo Payload
            const brevoPayload: any = {
                sender: { 
                  name: senderName || 'Outreach Team', 
                  email: smtpEmail // This MUST be a verified sender in Brevo
                },
                to: [{ email: recipient }],
                replyTo: replyTo ? { email: replyTo } : undefined,
                subject: variantSubject,
              };

            if (isPlainText) {
              brevoPayload.textContent = `${variantBody}\n\n--\nRef: ${fingerprint}`;
            } else {
              brevoPayload.htmlContent = `
                <div style="font-family: sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
                    <div style="padding: 20px; background-color: #ffffff;">
                        ${variantBody.split('\n').map((line: string) => `<p style="margin-bottom: 15px;">${line}</p>`).join('')}
                    </div>
                    <div style="padding: 20px; border-top: 1px solid #eeeeee; font-size: 11px; color: #999999; text-align: center;">
                        <p>Ref: ${fingerprint} | Sent by ${senderName || smtpEmail}</p>
                        <p><a href="#" style="color: #999999;">Unsubscribe</a></p>
                    </div>
                </div>
              `;
            }

            const result = await sendViaBrevo(brevoPayload);
            successCount++;
            console.log(`[${i+1}/${total}] Sent to ${recipient} - MessageID: ${result.messageId}`);
            
            // 5. Anti-spam delays (Brevo is faster but we should still be careful)
            if (i < total - 1) {
                const delay = (i + 1) % 15 === 0 ? 5000 : 800; // Smaller delays for professional API
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (sendError: any) {
            failCount++;
            console.error(`Failed to send to ${recipient}:`, sendError.message);
            // We'll return the last error if all failed or some failed
        }
    }

    const overallSuccess = successCount > 0;
    return NextResponse.json({ 
        success: overallSuccess, 
        message: `Campaign complete. Sent: ${successCount}, Failed: ${failCount}${failCount > 0 ? '. Check server logs for details.' : ''}` 
    });

  } catch (error: any) {
    console.error('Critical Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to initiate campaign.' }, { status: 500 });
  }
}

