import { sendEmail, getPortalBaseUrl } from '@/lib/email';

/**
 * Send a one-time approval email when a profile becomes approved.
 * Uses profiles.approval_email_sent_at to avoid duplicate sends.
 */
export async function notifyApprovalIfNeeded(db, {
  userId,
  email,
  companyName,
  wasApproved,
  nowApproved,
}) {
  if (!userId || !email || !nowApproved || wasApproved) {
    return { sent: false, reason: 'not_newly_approved' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('approval_email_sent_at')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.approval_email_sent_at) {
    return { sent: false, reason: 'already_sent' };
  }

  const portalUrl = getPortalBaseUrl();
  const displayName = companyName || 'your company';

  await sendEmail({
    to: email,
    subject: 'Your Toys2000 wholesale account is approved',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1d26; max-width: 560px;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">You're approved!</h1>
        <p>Good news — <strong>${escapeHtml(displayName)}</strong> is approved to shop on the Toys2000 wholesale portal.</p>
        <p>You can now sign in to view pricing, place orders, and manage your profile.</p>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}/catalog" style="background: #f15a24; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Browse catalog
          </a>
        </p>
        <p style="font-size: 13px; color: #5f6980;">Questions? Reply to this email or contact the Toys2000 team.</p>
      </div>
    `,
  });

  await db
    .from('profiles')
    .update({ approval_email_sent_at: new Date().toISOString() })
    .eq('id', userId);

  return { sent: true };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
