import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { notifyCustomerImportComplete } from '@/lib/notify-import';

/**
 * POST /api/admin/customers/import/notify
 * Send import summary email to assigned rep + ORDER_NOTIFY_EMAIL.
 */
export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { salespersonId, filename, results } = body;
  if (!Array.isArray(results)) {
    return NextResponse.json({ error: 'results array is required' }, { status: 400 });
  }

  try {
    const outcome = await notifyCustomerImportComplete({
      salespersonId: salespersonId ?? null,
      filename: filename ?? null,
      results,
    });
    return NextResponse.json(outcome);
  } catch (err) {
    console.error('[/api/admin/customers/import/notify]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
