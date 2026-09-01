'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function formatDate(ms) {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

export default function PendingApplicationsPanel() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [showAllUnapproved, setShowAllUnapproved] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [source, setSource] = useState('local');

  const load = useCallback(async ({ all = false, sync = false } = {}) => {
    if (sync) setSyncing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (all) params.set('all', '1');
      if (sync) params.set('sync', '1');
      const qs = params.toString();
      const res = await fetch(`/api/admin/customers/pending${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load pending applications');
      setCustomers(data.customers ?? []);
      setSource(data.source ?? (all ? 'markettime' : 'local'));
      if (sync && data.sync) {
        toast.success(`Synced ${data.sync.upserted} application(s) from MarketTime`);
      }
    } catch (err) {
      setError(err.message);
      setCustomers([]);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load({ all: showAllUnapproved });
  }, [load, showAllUnapproved]);

  const handleApprove = async (retailerID, companyName) => {
    if (!window.confirm(
      `Approve ${companyName || retailerID} in MarketTime?\n\nThey will appear in Jimmy's customer list and can create a portal login.`
    )) {
      return;
    }

    setActionId(retailerID);
    try {
      const res = await fetch('/api/admin/customers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailerIds: [retailerID] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');

      const ok = data.results?.find((r) => r.retailerID === retailerID)?.ok;
      if (!ok) {
        throw new Error(data.results?.[0]?.error || 'Approve failed');
      }

      toast.success(`Approved ${companyName || retailerID}`);
      setCustomers((prev) => prev.filter((c) => c.recordID !== retailerID));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDeny = async (retailerID, companyName) => {
    if (!window.confirm(
      `Deny ${companyName || retailerID}?\n\nThey will be marked inactive in MarketTime and removed from this pending list. They will not get portal access.`
    )) {
      return;
    }

    setActionId(retailerID);
    try {
      const res = await fetch('/api/admin/customers/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailerIds: [retailerID] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deny failed');

      const ok = data.results?.find((r) => r.retailerID === retailerID)?.ok;
      if (!ok) {
        throw new Error(data.results?.[0]?.error || 'Deny failed');
      }

      toast.success(`Denied ${companyName || retailerID}`);
      setCustomers((prev) => prev.filter((c) => c.recordID !== retailerID));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Pending Applications {loading || syncing ? '' : `(${customers.length})`}
          </h2>
          <p className="text-sm text-[#5f6980] mt-1">
            Website registrations waiting for approval. Default list loads instantly from the database.
            {source === 'markettime' ? ' Showing full MarketTime scan (slower).' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[#5f6980] flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllUnapproved}
              onChange={(e) => setShowAllUnapproved(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show all unapproved (slow MT scan)
          </label>
          {!showAllUnapproved && (
            <button
              type="button"
              onClick={() => load({ sync: true })}
              disabled={loading || syncing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-[#1a1d26] hover:bg-[#f7f8fa] disabled:opacity-60"
              title="One-time backfill of web applications from MarketTime (~40s)"
            >
              {syncing ? 'Syncing…' : 'Sync from MarketTime'}
            </button>
          )}
          <button
            type="button"
            onClick={() => load({ all: showAllUnapproved })}
            disabled={loading || syncing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-[#1a1d26] hover:bg-[#f7f8fa] disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 text-sm px-4 py-3 rounded-lg bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {(loading || syncing) && !customers.length ? (
        <p className="px-6 py-8 text-sm text-[#5f6980]">
          {syncing
            ? 'Syncing from MarketTime (can take ~40s the first time)…'
            : showAllUnapproved
              ? 'Scanning MarketTime customers (can take ~40s)…'
              : 'Loading pending applications…'}
        </p>
      ) : customers.length === 0 ? (
        <p className="px-6 py-8 text-sm text-[#5f6980]">
          {showAllUnapproved
            ? 'No unapproved MarketTime customers found.'
            : 'No website applications waiting for approval. If you expect older ones, click “Sync from MarketTime” once.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#f7f8fa]">
                {['Company', 'Contact', 'Email', 'Location', 'Applied', 'ID', ''].map((h) => (
                  <th
                    key={h || 'action'}
                    className="px-4 py-3 text-left text-xs font-bold text-[#5f6980] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.recordID}
                  className="border-b border-black/[0.04] hover:bg-[#f7f8fa] transition-colors"
                >
                  <td className="px-4 py-3 text-[#1a1d26] font-medium">
                    {customer.name || '—'}
                    {customer.isWebRegistration && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[#00aeef] bg-[#e0f7ff] px-1.5 py-0.5 rounded">
                        Web
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5f6980]">{customer.contactName || '—'}</td>
                  <td className="px-4 py-3 text-[#5f6980]">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-[#5f6980]">
                    {[customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-[#5f6980] text-xs whitespace-nowrap">
                    {formatDate(customer.dateAdded)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#5f6980]">{customer.recordID}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(customer.recordID, customer.name)}
                        disabled={actionId === customer.recordID}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #8cc63f, #a8d96a)' }}
                      >
                        {actionId === customer.recordID ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeny(customer.recordID, customer.name)}
                        disabled={actionId === customer.recordID}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #e11d48, #fb7185)' }}
                      >
                        Deny
                      </button>
                    </div>
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
