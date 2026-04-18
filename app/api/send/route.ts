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

    const emailPromises = emails.map((recipient: string) => {
      return transporter.sendMail({
        from: senderName ? `"${senderName}" <${smtpEmail}>` : smtpEmail,
        to: recipient,
        replyTo: replyTo || smtpEmail,
        subject: subject,
        text: emailContent, 
      });
    });

    // We can run them in batches or all together if the list isn't too large
    // We await all to finish
    await Promise.allSettled(emailPromises);

    return NextResponse.json({ success: true, message: `Sent ${emails.length} emails.` });

  } catch (error: any) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to send emails.' }, { status: 500 });
  }
}
