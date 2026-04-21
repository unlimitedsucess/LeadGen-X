import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log("POST /api/send - START");
  try {
    const body = await req.json();
    console.log("POST /api/send - BODY PARSED");
    const { emails, subject, body: emailContent, smtpEmail, smtpPassword, replyTo, senderName } = body;

    if (!emails || !emails.length) {
      return NextResponse.json({ success: false, error: 'No emails provided.' }, { status: 400 });
    }
    if (!smtpEmail || !smtpPassword) {
      return NextResponse.json({ success: false, error: 'SMTP credentials required.' }, { status: 400 });
    }

    // Configure Nodemailer transporter use Gmail SMTP natively
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpEmail,
        pass: smtpPassword, // Important: This must be an App Password, not the regular Gmail password
      },
    });

    // Test connection
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP Connection Error:', verifyError);
      return NextResponse.json({ success: false, error: 'Failed to connect to SMTP server. Ensure you are using a Gmail App Password.' }, { status: 401 });
    }

    const results = [];
    const total = emails.length;
    
    for (let i = 0; i < total; i++) {
        const recipient = emails[i];
        try {
            // We use both text and html for better deliverability
            await transporter.sendMail({
                from: senderName ? `"${senderName}" <${smtpEmail}>` : smtpEmail,
                to: recipient,
                replyTo: replyTo || smtpEmail,
                subject: subject,
                text: emailContent,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
                        <div style="padding: 20px; background-color: #ffffff;">
                            ${emailContent.split('\n').map((line: string) => `<p style="margin-bottom: 15px;">${line}</p>`).join('')}
                        </div>
                        <div style="padding: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: center;">
                            Sent via LeadGen X Delivery Engine
                        </div>
                    </div>
                `,
            });
            console.log(`[${i+1}/${total}] Successfully sent to ${recipient}`);
            
            // Randomized delay between 1.5 and 3.5 seconds to mimic human behavior
            if (i < total - 1) {
                const delay = 1500 + Math.random() * 2000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (sendError) {
            console.error(`Failed to send to ${recipient}:`, sendError);
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Campaign complete. Processed ${total} recipients with intelligent delays.` 
    });

  } catch (error: any) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to send emails.' }, { status: 500 });
  }
}
