/**
 * Transactional email via Resend HTTP API.
 * Set RESEND_API_KEY and EMAIL_FROM in env. Skips silently when unset.
 */

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY or EMAIL_FROM not set — skipping send');
    return { skipped: true };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const filtered = recipients.filter(Boolean);
  if (!filtered.length) {
    console.warn('[email] No recipients — skipping send');
    return { skipped: true };
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: filtered,
      subject,
      html,
      text: text ?? stripHtml(html),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getPortalBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    || 'http://localhost:3000'
  );
}
