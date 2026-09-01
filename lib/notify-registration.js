import { sendEmail, getPortalBaseUrl } from '@/lib/email';

/**
 * Notify Jimmy (ORDER_NOTIFY_EMAIL) that a retailer applied via the website.
 */
export async function notifyNewRegistration({
  companyName,
  email,
  phone,
  city,
  state,
  contactName,
  taxId,
  recordID,
}) {
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!to) {
    console.warn('[notify-registration] ORDER_NOTIFY_EMAIL not set — skipping');
    return { skipped: true, reason: 'no_recipients' };
  }

  const portalUrl = getPortalBaseUrl();
  const displayContact = contactName || '—';

  await sendEmail({
    to,
    subject: `New retailer application — ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d26; max-width: 560px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">New wholesale application</h1>
        <p>A retailer registered on the Toys2000 website and is waiting for approval.</p>
        <table cellpadding="6" cellspacing="0" style="font-size: 14px; margin: 16px 0;">
          <tr><td style="color:#5f6980;">Company</td><td><strong>${escapeHtml(companyName)}</strong></td></tr>
          <tr><td style="color:#5f6980;">Contact</td><td>${escapeHtml(displayContact)}</td></tr>
          <tr><td style="color:#5f6980;">Email</td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="color:#5f6980;">Phone</td><td>${escapeHtml(phone || '—')}</td></tr>
          <tr><td style="color:#5f6980;">Location</td><td>${escapeHtml([city, state].filter(Boolean).join(', ') || '—')}</td></tr>
          ${taxId ? `<tr><td style="color:#5f6980;">Tax / Resale ID</td><td>${escapeHtml(taxId)}</td></tr>` : ''}
          ${recordID ? `<tr><td style="color:#5f6980;">MarketTime ID</td><td><code>${escapeHtml(recordID)}</code></td></tr>` : ''}
        </table>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}/admin" style="background: #f15a24; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review in admin
          </a>
        </p>
        <p style="font-size: 13px; color: #5f6980;">
          Approve them under <strong>Pending Applications</strong> so they appear in MarketTime and can create a portal login.
        </p>
      </div>
    `,
  });

  return { sent: true };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
