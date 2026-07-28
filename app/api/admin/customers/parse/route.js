import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { readExcelBuffer } from '@/lib/customer-upload';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/admin/customers/parse
 * Admin-only. Upload an Excel file, validate rows, return dry-run preview.
 */
export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Excel file is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const name = file.name?.toLowerCase() ?? '';
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    return NextResponse.json({ error: 'Upload an .xlsx or .xls file' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = readExcelBuffer(buffer);

    const samplePayloads = parsed.rows
      .filter((row) => row.valid)
      .slice(0, 3)
      .map((row) => ({ index: row.index, companyName: row.companyName, payload: row.payload }));

    const validationIssues = parsed.rows
      .filter((row) => !row.valid)
      .slice(0, 20)
      .map((row) => ({
        index: row.index,
        companyName: row.companyName,
        errors: row.validationErrors,
      }));

    return NextResponse.json({
      filename: file.name,
      sheetName: parsed.sheetName,
      headers: parsed.headers,
      missingColumns: parsed.missingRequiredColumns,
      missingRequiredColumns: parsed.missingRequiredColumns,
      columnMapping: parsed.columnMapping,
      summary: parsed.summary,
      samplePayloads,
      validationIssues,
      // Client stores full valid rows locally for import (payloads only)
      importRows: parsed.rows
        .filter((row) => row.valid)
        .map((row) => ({
          index: row.index,
          companyName: row.companyName,
          payload: row.payload,
        })),
    });
  } catch (err) {
    console.error('[/api/admin/customers/parse]', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
