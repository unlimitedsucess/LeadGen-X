import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
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

export async function POST(req: Request) {
  console.log("POST /api/send - START");
  try {
    const payload = await req.json();
    console.log("POST /api/send - BODY PARSED");
    let { 
      emails, 
      subject, 
      body: emailContent, 
      smtpEmail, 
      smtpPassword, 
      smtpHost = 'smtp.gmail.com', 
      smtpPort = 465, 
      replyTo, 
      senderName,
      isPlainText = false
    } = payload;

    // Sanitize credentials
    smtpEmail = smtpEmail?.trim();
    smtpPassword = smtpPassword?.trim();

    if (!emails || !emails.length) {
      return NextResponse.json({ success: false, error: 'No emails provided.' }, { status: 400 });
    }
    if (!smtpEmail || !smtpPassword) {
      return NextResponse.json({ success: false, error: 'SMTP credentials required.' }, { status: 400 });
    }

    // Clean the password (remove spaces often copied from Google UI)
    const cleanPassword = smtpPassword.replace(/\s+/g, '');

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, 
      auth: {
        user: smtpEmail,
        pass: cleanPassword, 
      },
      family: 4,
      connectionTimeout: 15000, 
      greetingTimeout: 15000,
      socketTimeout: 15000
    } as any);

    // Test connection
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      console.error('SMTP Connection Error:', verifyError);
      return NextResponse.json({ 
        success: false, 
        error: `Gmail Connection Failed: ${verifyError.message || 'Invalid Credentials'}.` 
      }, { status: 401 });
    }

    const results = [];
    const total = emails.length;
    
    for (let i = 0; i < total; i++) {
        const recipient = emails[i];
        try {
            // 1. Parse Spintax for uniqueness
            let variantSubject = parseSpintax(subject);
            let variantBody = autoDiversify(emailContent); 
            variantBody = parseSpintax(variantBody);

            // 2. Simple Personalization
            variantBody = variantBody.replace(/{{email}}/g, recipient);
            
            // 3. Generate a unique fingerprint for this specific email
            const fingerprint = crypto.randomUUID().substring(0, 8);

            // 4. Add a subtle unique identifier to the subject to bypass Gmail's "duplicate" detection
            variantSubject = `${variantSubject} [Ref: ${fingerprint.substring(0, 4)}]`;

            const mailOptions: any = {
                from: senderName ? `"${senderName}" <${smtpEmail}>` : smtpEmail,
                to: recipient,
                replyTo: replyTo || smtpEmail,
                subject: variantSubject,
                text: `${variantBody}\n\n--\nRef: ${fingerprint}`,
            };

            // Only add HTML if plain text mode is OFF
            if (!isPlainText) {
                mailOptions.html = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
                        <div style="padding: 20px; background-color: #ffffff;">
                            ${variantBody.split('\n').map((line: string) => `<p style="margin-bottom: 15px;">${line}</p>`).join('')}
                        </div>
                        <div style="padding: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999; text-align: center;">
                            <p>Sent by ${senderName || smtpEmail} regarding partnership inquiry.</p>
                            <p>Ref: ${fingerprint} | <a href="#" style="color: #999999; text-decoration: underline;">Unsubscribe</a></p>
                        </div>
                    </div>
                `;
            }

            await transporter.sendMail(mailOptions);
            console.log(`[${i+1}/${total}] Successfully sent to ${recipient}`);
            
            // 5. More aggressive and variable delays
            if (i < total - 1) {
                // Take a longer break every 10 emails (Cool down)
                const isCooldown = (i + 1) % 10 === 0;
                const delay = isCooldown ? (20000 + Math.random() * 10000) : (4000 + Math.random() * 8000);
                
                console.log(`Waiting ${Math.round(delay/1000)}s before next send... ${isCooldown ? '(Cooling down)' : ''}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (sendError) {
            console.error(`Failed to send to ${recipient}:`, sendError);
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Campaign complete. Processed ${total} recipients with anti-spam randomization.` 
    });

  } catch (error: any) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to send emails.' }, { status: 500 });
  }
}
