/**
 * Build a CSV of failed bulk-import rows for download in the admin UI.
 */
export function buildFailedImportCsv(results = [], importRows = []) {
  const rowByIndex = new Map(importRows.map((row) => [row.index, row]));
  const failed = results.filter((result) => !result.ok);

  const headers = ['row', 'company', 'email', 'state', 'error'];
  const lines = [headers.join(',')];

  for (const result of failed) {
    const source = rowByIndex.get(result.index);
    const payload = source?.payload ?? {};
    lines.push([
      result.index + 1,
      csvCell(result.companyName || payload.name),
      csvCell(payload.email),
      csvCell(payload.state),
      csvCell(result.detail || 'Import failed'),
    ].join(','));
  }

  return lines.join('\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadTextFile(filename, content, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
