/**
 * Send a test email through Resend using .env config.
 *
 * Usage:
 *   npm run test:resend
 *   npm run test:resend -- you@example.com
 */

import { sendEmail, getPortalBaseUrl } from '../lib/email.js';

const recipient = process.argv[2]?.trim()
  || process.env.ORDER_NOTIFY_EMAIL?.trim()
  || process.env.TEST_EMAIL_TO?.trim();

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    console.error('Missing RESEND_API_KEY in .env');
    process.exit(1);
  }

  if (!from) {
    console.error('Missing EMAIL_FROM in .env (e.g. Toys2000 <orders@yourdomain.com>)');
    process.exit(1);
  }

  if (!recipient) {
    console.error('No recipient. Pass an email or set ORDER_NOTIFY_EMAIL in .env');
    console.error('Example: npm run test:resend -- you@example.com');
    process.exit(1);
  }

  const sentAt = new Date().toISOString();
  const portalUrl = getPortalBaseUrl();

  console.log('Resend test email');
  console.log(`  From:      ${from}`);
  console.log(`  To:        ${recipient}`);
  console.log(`  Portal:    ${portalUrl}`);
  console.log(`  Key:       ${apiKey.slice(0, 6)}…${apiKey.slice(-4)}`);
  console.log('');

  try {
    const result = await sendEmail({
      to: recipient,
      subject: 'Toys2000 portal — Resend test',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d26; max-width: 520px;">
          <h1 style="font-size: 20px;">Resend is working</h1>
          <p>This is a test message from <strong>toys2000-portal</strong>.</p>
          <p>Sent at: ${sentAt}</p>
          <p><a href="${portalUrl}">Open portal</a></p>
        </div>
      `,
    });

    if (result.skipped) {
      console.error('Email was skipped — check RESEND_API_KEY and EMAIL_FROM');
      process.exit(1);
    }

    console.log('Sent successfully.');
    if (result.id) console.log(`  Resend id: ${result.id}`);
    process.exit(0);
  } catch (err) {
    console.error('Send failed:', err.message);
    console.error('');
    console.error('Common fixes:');
    console.error('  • Verify the domain in Resend and use a matching EMAIL_FROM address');
    console.error('  • On the free tier, you can only send to your Resend account email until verified');
    process.exit(1);
  }
}

main();
