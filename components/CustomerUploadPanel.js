'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CUSTOMER_FIELD_ALIASES,
  IMPORT_BATCH_SIZE,
  REQUIRED_CUSTOMER_FIELDS,
} from '@/lib/customer-upload';
import { buildFailedImportCsv, downloadTextFile } from '@/lib/import-results-export';

export default function CustomerUploadPanel({ defaultSalespersonId = '' }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [importResults, setImportResults] = useState([]);
  const [approving, setApproving] = useState(false);
  const [salespeople, setSalespeople] = useState([]);
  const [salespeopleLoading, setSalespeopleLoading] = useState(true);
  const [salespeopleError, setSalespeopleError] = useState(null);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState(defaultSalespersonId || '');
  const [lastImportSalespersonId, setLastImportSalespersonId] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let loadError = null;

      try {
        const res = await fetch('/api/admin/salespeople');
        const data = await res.json();
        if (!res.ok) {
          const message = data.error || 'Could not load salespeople';
          loadError = data.code === 'mt_auth_failed'
            ? data.error
            : message;
          if (!cancelled) setSalespeopleError(loadError);
          throw new Error(message);
        }

        if (!cancelled) {
          setSalespeopleError(null);
          setSalespeople(data.salespeople ?? []);
          setSelectedSalespersonId((current) => {
            if (current) return current;
            if (defaultSalespersonId) return defaultSalespersonId;
            return data.salespeople?.[0]?.recordID ?? '';
          });
        }
      } catch (err) {
        if (!cancelled && !loadError) {
          toast.error(err.message);
        }
      } finally {
        if (!cancelled) setSalespeopleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultSalespersonId]);

  const selectedSalesperson = useMemo(
    () => salespeople.find((person) => person.recordID === selectedSalespersonId),
    [salespeople, selectedSalespersonId]
  );

  const successfulImportIds = importResults
    .filter((result) => result.ok && result.recordID)
    .map((result) => result.recordID);

  const failedImportCount = importResults.filter((result) => !result.ok).length;

  const handleParse = async () => {
    if (!file) {
      toast.error('Choose an Excel file first');
      return;
    }

    setParsing(true);
    setParseResult(null);
    setImportRows([]);
    setImportProgress(null);
    setImportResults([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/customers/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Parse failed');

      setParseResult(data);
      setImportRows(data.importRows ?? []);

      if (data.missingRequiredColumns?.length) {
        toast.error(`Could not find columns for: ${data.missingRequiredColumns.join(', ')}`);
      } else {
        toast.success(`Ready: ${data.summary.valid} of ${data.summary.total} rows`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setParsing(false);
    }
  };

  const sendImportNotification = async (results, salespersonId) => {
    try {
      const res = await fetch('/api/admin/customers/import/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salespersonId,
          filename: parseResult?.filename ?? file?.name ?? null,
          results,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Notification failed');
      if (data.skipped) {
        toast('Import done — email skipped (no rep email or ORDER_NOTIFY_EMAIL)', { icon: 'ℹ️' });
      } else {
        toast.success('Import summary emailed to rep');
      }
    } catch (err) {
      toast.error(`Import finished but email failed: ${err.message}`);
    }
  };

  const handleImport = async () => {
    if (!importRows.length) {
      toast.error('Parse a file first');
      return;
    }

    if (!selectedSalespersonId) {
      toast.error('Select a salesperson for this upload');
      return;
    }

    const repLabel = selectedSalesperson?.name ?? selectedSalespersonId;
    if (!window.confirm(
      `Create ${importRows.length} customers in MarketTime and assign them to ${repLabel}? This cannot be undone.`
    )) {
      return;
    }

    setImporting(true);
    setImportResults([]);
    const allResults = [];
    let succeeded = 0;
    let failed = 0;

    try {
      for (let offset = 0; offset < importRows.length; offset += IMPORT_BATCH_SIZE) {
        const batch = importRows.slice(offset, offset + IMPORT_BATCH_SIZE);
        setImportProgress({
          done: offset,
          total: importRows.length,
          current: batch[0]?.companyName,
        });

        const res = await fetch('/api/admin/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: batch,
            salespersonId: selectedSalespersonId,
          }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Import batch failed');

        for (const result of data.results ?? []) {
          allResults.push(result);
          if (result.ok) succeeded += 1;
          else failed += 1;
        }

        setImportResults([...allResults]);
      }

      setImportProgress({ done: importRows.length, total: importRows.length, current: null });
      setLastImportSalespersonId(selectedSalespersonId);
      toast.success(`Import complete: ${succeeded} created, ${failed} failed`);
      await sendImportNotification(allResults, selectedSalespersonId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadFailedRows = () => {
    const csv = buildFailedImportCsv(importResults, importRows);
    if (!csv.split('\n')[1]) {
      toast.error('No failed rows to export');
      return;
    }

    const base = (parseResult?.filename || file?.name || 'customer-upload').replace(/\.[^.]+$/, '');
    downloadTextFile(`${base}-failed-rows.csv`, csv);
  };

  const handleApproveImported = async () => {
    if (!successfulImportIds.length) {
      toast.error('No successful imports with retailer IDs to approve');
      return;
    }

    if (!window.confirm(
      `Approve ${successfulImportIds.length} customers in MarketTime so they appear in the rep customer list?`
    )) {
      return;
    }

    setApproving(true);
    let approved = 0;
    let failed = 0;

    try {
      for (let offset = 0; offset < successfulImportIds.length; offset += 100) {
        const batch = successfulImportIds.slice(offset, offset + 100);
        const res = await fetch('/api/admin/customers/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retailerIds: batch }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Approve batch failed');
        approved += data.approved ?? 0;
        failed += data.failed ?? 0;
      }
      toast.success(`Approved ${approved} customers${failed ? `, ${failed} failed` : ''}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApproving(false);
    }
  };

  const progressPct = importProgress
    ? Math.round((importProgress.done / importProgress.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-8">
      <h2 className="font-bold text-[#1a1d26] mb-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
        Bulk Customer Upload
      </h2>
      <p className="text-sm text-[#5f6980] mb-4 leading-relaxed">
        Creates customers in MarketTime, assigns them to the salesperson you choose, and approves them for the rep group.
        The assigned rep and <code className="text-xs">ORDER_NOTIFY_EMAIL</code> receive a summary email when the import finishes.
      </p>
      <p className="text-sm text-[#5f6980] mb-4">
        Upload an Excel file (.xlsx or .xls) to create customers in MarketTime (one API call per row).
        Columns can be in any order. Required per row: <strong>name</strong>, <strong>email</strong>, <strong>state</strong>, <strong>country</strong>, <strong>city</strong>, <strong>address</strong>, <strong>zip</strong>, and <strong>phone</strong> (country defaults to US when absent).
      </p>

      {salespeopleError && (
        <div className="mb-4 text-sm px-4 py-3 rounded-lg bg-red-50 text-red-800 border border-red-200">
          <p className="font-semibold">Could not load salespeople from MarketTime</p>
          <p className="mt-1">{salespeopleError}</p>
          <p className="mt-2 text-xs">
            Run <code className="bg-red-100 px-1 rounded">npm run verify:mt</code> to confirm.
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">
          Assign to salesperson
        </label>
        <select
          value={selectedSalespersonId}
          onChange={(e) => setSelectedSalespersonId(e.target.value)}
          disabled={salespeopleLoading || importing || Boolean(salespeopleError)}
          className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1a1d26] bg-white"
        >
          {salespeopleLoading && <option value="">Loading salespeople…</option>}
          {!salespeopleLoading && !salespeopleError && salespeople.length === 0 && (
            <option value="">No salespeople found in MarketTime</option>
          )}
          {salespeople.map((person) => (
            <option key={person.recordID} value={person.recordID}>
              {person.name}{person.abbreviation ? ` (${person.abbreviation})` : ''} — {person.recordID}
            </option>
          ))}
        </select>
        {selectedSalesperson?.email && (
          <p className="text-xs text-[#5f6980] mt-1">
            Import summary will email {selectedSalesperson.email}
          </p>
        )}
      </div>

      <details className="mb-4 text-xs text-[#5f6980]">
        <summary className="cursor-pointer font-semibold text-[#1a1d26] mb-2">Supported export formats</summary>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <span className="font-medium text-[#1a1d26]">US Divers</span> — CSTNAM, NAME, EMAIL, STATE, Country, ADR1, ADR2, ADR4, ZIPCD, PHN, CSTNO
          </li>
          <li>
            <span className="font-medium text-[#1a1d26]">Allen Gerber retailers</span> — Customer Name, ShipTo Name, ShipTo Address, Email, City, ST, Zip, Phone
          </li>
        </ul>
      </details>

      <details className="mb-4 text-xs text-[#5f6980]">
        <summary className="cursor-pointer font-semibold text-[#1a1d26] mb-2">Recognized column headers</summary>
        <p className="mt-2 mb-2">Required (one column each): name, email, state, country</p>
        <ul className="list-disc pl-5 space-y-1">
          {REQUIRED_CUSTOMER_FIELDS.map((field) => (
            <li key={field}>
              <span className="font-medium text-[#1a1d26]">{CUSTOMER_FIELD_ALIASES[field][0]}</span>
              {' — also: '}
              {CUSTOMER_FIELD_ALIASES[field].slice(1).join(', ')}
            </li>
          ))}
        </ul>
        <p className="mt-3 mb-2">Optional:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {Object.entries(CUSTOMER_FIELD_ALIASES)
            .filter(([field]) => !REQUIRED_CUSTOMER_FIELDS.includes(field))
            .map(([field, aliases]) => (
              <li key={field}>{aliases.join(', ')}</li>
            ))}
        </ul>
      </details>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setParseResult(null);
            setImportRows([]);
            setImportResults([]);
          }}
          className="text-sm text-[#5f6980] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f7f8fa] file:text-[#1a1d26]"
        />
        <button
          onClick={handleParse}
          disabled={!file || parsing || importing}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #00aeef, #33c1ff)' }}
        >
          {parsing ? 'Parsing…' : 'Parse & preview (dry run)'}
        </button>
        <button
          onClick={handleImport}
          disabled={!importRows.length || !selectedSalespersonId || parsing || importing}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
        >
          {importing ? `Importing… ${progressPct}%` : `Import ${importRows.length || ''} customers`}
        </button>
      </div>

      {parseResult && (
        <div className="text-sm px-4 py-3 rounded-lg bg-[#f7f8fa] text-[#1a1d26] mb-4 space-y-2">
          <p>
            <strong>{parseResult.filename}</strong> — sheet &quot;{parseResult.sheetName}&quot;:
            {' '}{parseResult.summary.valid} valid, {parseResult.summary.invalid} skipped
          </p>
          {parseResult.missingRequiredColumns?.length > 0 && (
            <p className="text-red-700">
              Could not match required columns: {parseResult.missingRequiredColumns.join(', ')}
            </p>
          )}
          {parseResult.columnMapping?.length > 0 && (
            <p className="text-xs text-[#5f6980]">
              Matched: {parseResult.columnMapping.map((m) => `${m.label} → "${m.column}"`).join('; ')}
            </p>
          )}
          {parseResult.validationIssues?.length > 0 && (
            <div>
              <p className="font-semibold text-amber-800">Validation issues (sample):</p>
              <ul className="text-xs text-amber-900 mt-1 space-y-1">
                {parseResult.validationIssues.map((issue) => (
                  <li key={issue.index}>
                    Row {issue.index + 1} ({issue.companyName}): {issue.errors.join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parseResult.samplePayloads?.length > 0 && (
            <details>
              <summary className="cursor-pointer font-semibold">Sample MarketTime payloads</summary>
              <pre className="mt-2 text-xs overflow-x-auto bg-white p-3 rounded-lg border border-black/[0.06]">
                {JSON.stringify(parseResult.samplePayloads, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {importing && importProgress && (
        <div className="mb-4">
          <div className="h-2 bg-[#eef0f4] rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
            />
          </div>
          <p className="text-xs text-[#5f6980] mt-1">
            {importProgress.done} / {importProgress.total}
            {importProgress.current ? ` — ${importProgress.current}` : ''}
          </p>
        </div>
      )}

      {importResults.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleApproveImported}
            disabled={!successfulImportIds.length || approving || importing}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #00aeef, #33c1ff)' }}
          >
            {approving
              ? 'Approving…'
              : `Approve ${successfulImportIds.length} imported customers`}
          </button>
          {failedImportCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadFailedRows}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-[#1a1d26] hover:bg-[#f7f8fa]"
            >
              Download {failedImportCount} failed rows (CSV)
            </button>
          )}
          <p className="text-xs text-[#5f6980] self-center">
            {lastImportSalespersonId
              ? `Last import assigned to ${lastImportSalespersonId}.`
              : 'Use approve if customers were created but don&apos;t show in MarketTime yet.'}
          </p>
        </div>
      )}

      {importResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto text-xs border border-black/[0.06] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#f7f8fa] sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Row</th>
                <th className="px-3 py-2 text-left">Company</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {importResults.map((r) => (
                <tr key={r.index} className="border-t border-black/[0.04]">
                  <td className="px-3 py-1.5">{r.index + 1}</td>
                  <td className="px-3 py-1.5">{r.companyName}</td>
                  <td className={`px-3 py-1.5 ${r.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {r.ok
                      ? `${r.detail || 'Created'}${r.recordID ? ` (${r.recordID})` : ''}`
                      : r.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
