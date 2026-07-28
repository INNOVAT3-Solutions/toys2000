import { sendEmail, getPortalBaseUrl } from '@/lib/email';
import { formatCurrency } from '@/lib/cart';

/**
 * Notify Jimmy and the customer when a B2B order is placed.
 */
export async function notifyOrderPlaced({
  order,
  customerEmail,
  companyName,
}) {
  const notifyEmail = process.env.ORDER_NOTIFY_EMAIL;
  const portalUrl = getPortalBaseUrl();
  const orderId = order?.recordID ?? order?.id;
  const manufacturerName = order?.manufacturerName ?? 'Vendor';
  const poNumber = order?.poNumber ?? '—';
  const details = order?.details ?? [];

  const lineTotal = details.reduce(
    (sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0),
    0
  );

  const linesHtml = details
    .map((line) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      return `<li>${escapeHtml(line.name ?? line.itemNumber ?? 'Item')} × ${qty} — ${formatCurrency(price * qty)}</li>`;
    })
    .join('');

  const orderUrl = orderId ? `${portalUrl}/orders/${orderId}` : `${portalUrl}/orders`;
  const summaryHtml = `
    <p><strong>Vendor:</strong> ${escapeHtml(manufacturerName)}</p>
    <p><strong>PO:</strong> ${escapeHtml(poNumber)}</p>
    <p><strong>Subtotal:</strong> ${formatCurrency(lineTotal)}</p>
    <ul>${linesHtml}</ul>
  `;

  const tasks = [];

  if (notifyEmail) {
    tasks.push(
      sendEmail({
        to: notifyEmail,
        subject: `New order — ${companyName || customerEmail || 'Retailer'} (${manufacturerName})`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d26; max-width: 600px;">
            <h1 style="font-size: 20px;">New portal order</h1>
            <p><strong>Retailer:</strong> ${escapeHtml(companyName || '—')}</p>
            <p><strong>Email:</strong> ${escapeHtml(customerEmail || '—')}</p>
            ${summaryHtml}
            <p><a href="${orderUrl}">View order in portal</a></p>
          </div>
        `,
      })
    );
  }

  if (customerEmail) {
    tasks.push(
      sendEmail({
        to: customerEmail,
        subject: `Order confirmation — ${manufacturerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d26; max-width: 600px;">
            <h1 style="font-size: 20px;">Thanks for your order!</h1>
            <p>We received your order with <strong>${escapeHtml(manufacturerName)}</strong>.</p>
            ${summaryHtml}
            <p style="font-size: 13px; color: #5f6980;">Payment terms are Net 30. The vendor will contact you to arrange payment.</p>
            <p><a href="${orderUrl}">View order status</a></p>
          </div>
        `,
      })
    );
  }

  if (!tasks.length) {
    console.warn('[notify-order] ORDER_NOTIFY_EMAIL unset and no customer email — skipping');
    return { skipped: true };
  }

  await Promise.all(tasks);
  return { sent: true };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
