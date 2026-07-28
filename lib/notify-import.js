import { sendEmail, getPortalBaseUrl } from '@/lib/email';
import { getSalesperson } from '@/lib/markettime';

/**
 * Email the assigned rep (and ORDER_NOTIFY_EMAIL) after a bulk customer import.
 */
export async function notifyCustomerImportComplete({
  salespersonId,
  filename,
  results = [],
}) {
  const succeeded = results.filter((row) => row.ok);
  const failed = results.filter((row) => !row.ok);

  let salesperson = null;
  if (salespersonId) {
    try {
      salesperson = await getSalesperson(salespersonId);
    } catch (err) {
      console.warn('[notify-import] Could not load salesperson:', err.message);
    }
  }

  const recipients = new Set();
  if (salesperson?.email) recipients.add(salesperson.email);
  if (process.env.ORDER_NOTIFY_EMAIL) recipients.add(process.env.ORDER_NOTIFY_EMAIL);

  if (!recipients.size) {
    console.warn('[notify-import] No salesperson or ORDER_NOTIFY_EMAIL — skipping');
    return { skipped: true, reason: 'no_recipients' };
  }

  const repName = salesperson?.name ?? salespersonId ?? 'Sales rep';
  const portalUrl = getPortalBaseUrl();
  const failedPreview = failed.slice(0, 25);
  const failedRowsHtml = failedPreview.length
    ? `
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 13px; width: 100%;">
        <thead>
          <tr>
            <th align="left">Row</th>
            <th align="left">Company</th>
            <th align="left">Error</th>
          </tr>
        </thead>
        <tbody>
          ${failedPreview.map((row) => `
            <tr>
              <td>${row.index + 1}</td>
              <td>${escapeHtml(row.companyName || '—')}</td>
              <td>${escapeHtml(row.detail || 'Failed')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${failed.length > failedPreview.length
        ? `<p style="font-size: 12px; color: #5f6980;">…and ${failed.length - failedPreview.length} more — download the failed-rows CSV from the admin upload screen.</p>`
        : ''}
    `
    : '<p>All rows imported successfully.</p>';

  const successList = succeeded.slice(0, 15).map((row) =>
    `<li>${escapeHtml(row.companyName || 'Customer')}${row.recordID ? ` (${escapeHtml(row.recordID)})` : ''}</li>`
  ).join('');

  await sendEmail({
    to: [...recipients],
    subject: `Customer upload — ${succeeded.length} created${failed.length ? `, ${failed.length} failed` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d26; max-width: 640px;">
        <h1 style="font-size: 20px;">Bulk customer upload complete</h1>
        <p><strong>File:</strong> ${escapeHtml(filename || 'Upload')}</p>
        <p><strong>Assigned rep:</strong> ${escapeHtml(repName)}</p>
        <p><strong>Created:</strong> ${succeeded.length} &nbsp;·&nbsp; <strong>Failed:</strong> ${failed.length}</p>
        ${succeeded.length ? `
          <p style="font-weight: 600; margin-bottom: 4px;">New customers (sample):</p>
          <ul>${successList}</ul>
          ${succeeded.length > 15 ? `<p style="font-size: 12px; color: #5f6980;">…and ${succeeded.length - 15} more.</p>` : ''}
        ` : ''}
        ${failed.length ? `<p style="font-weight: 600; margin-top: 16px;">Failed rows:</p>${failedRowsHtml}` : ''}
        <p style="margin-top: 20px;"><a href="${portalUrl}/admin">Open admin dashboard</a></p>
      </div>
    `,
  });

  return { sent: true, recipientCount: recipients.size };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
