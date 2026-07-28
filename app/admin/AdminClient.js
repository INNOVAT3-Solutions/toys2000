'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import CustomerUploadPanel from '@/components/CustomerUploadPanel';

export default function AdminClient({ profiles: initialProfiles, syncLog, defaultSalespersonId = '' }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [editing, setEditing] = useState({}); // { [userId]: retailer_id value }
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [customerSyncing, setCustomerSyncing] = useState(false);
  const [customerSyncResult, setCustomerSyncResult] = useState(null);

  const handleRetailerIdChange = (userId, value) => {
    setEditing((prev) => ({ ...prev, [userId]: value }));
  };

  const handleRetailerIdSave = async (userId) => {
    const retailerId = editing[userId]?.trim();
    if (retailerId === undefined) return;

    const res = await fetch('/api/admin/set-retailer-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, retailerId }),
    });

    if (res.ok) {
      setProfiles((prev) =>
        prev.map((p) => p.id === userId ? { ...p, retailer_id: retailerId } : p)
      );
      setEditing((prev) => { const n = { ...prev }; delete n[userId]; return n; });
      toast.success('Retailer ID updated');
    } else {
      toast.error('Failed to update retailer ID');
    }
  };

  const handleToggleApproved = async (userId, currentValue) => {
    const res = await fetch('/api/admin/set-approved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, approved: !currentValue }),
    });

    if (res.ok) {
      setProfiles((prev) =>
        prev.map((p) => p.id === userId ? { ...p, approved: !currentValue } : p)
      );
      toast.success(`Account ${!currentValue ? 'approved' : 'unapproved'}`);
    } else {
      toast.error('Failed to update approval status');
    }
  };

  const handleSync = async (full = false) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/sync/trigger${full ? '?full=true' : ''}`, { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) {
        toast.success(`Sync complete: ${data.itemsSynced} products, ${data.manufacturersSynced} brands`);
      } else {
        toast.error(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCustomerSync = async () => {
    setCustomerSyncing(true);
    setCustomerSyncResult(null);
    try {
      const res = await fetch('/api/sync/customers/trigger', { method: 'POST' });
      const data = await res.json();
      setCustomerSyncResult(data);
      if (data.success) {
        toast.success(`Customer sync: ${data.linkedProfiles} profiles linked`);
      } else {
        toast.error(`Customer sync failed: ${data.error}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCustomerSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-[#1a1d26] mb-8" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Admin Dashboard
        </h1>

        {/* Catalog sync */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-8">
          <h2 className="font-bold text-[#1a1d26] mb-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Catalog Sync
          </h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: 'linear-gradient(135deg, #00aeef, #33c1ff)' }}
            >
              {syncing ? 'Syncing…' : 'Delta sync (yesterday → now)'}
            </button>
            <button
              onClick={() => handleSync(true)}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
            >
              {syncing ? 'Syncing…' : 'Full sync (all products)'}
            </button>
            <a
              href="/api/admin/catalog/missing-images"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-[#1a1d26] hover:bg-[#f7f8fa] inline-flex items-center"
            >
              Download missing-image CSV
            </a>
          </div>

          {syncResult && (
            <div className={`text-sm px-4 py-3 rounded-lg ${syncResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
              {syncResult.success
                ? `Synced ${syncResult.itemsSynced} products and ${syncResult.manufacturersSynced} brands in ${Math.round((new Date(syncResult.finishedAt) - new Date(syncResult.startedAt)) / 1000)}s`
                : `Error: ${syncResult.error}`}
            </div>
          )}

          {syncLog.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-[#5f6980] uppercase tracking-wide mb-2">Recent Syncs</p>
              <div className="space-y-1.5">
                {syncLog.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs text-[#5f6980]">
                    <span>{new Date(log.started_at).toLocaleString()}</span>
                    {log.error ? (
                      <span className="text-red-500 font-medium">Failed: {log.error.slice(0, 60)}</span>
                    ) : log.finished_at ? (
                      <span className="text-[#8cc63f] font-medium">
                        {log.items_synced ?? 0} products · {log.manufacturers_synced ?? 0} brands
                      </span>
                    ) : (
                      <span className="text-[#ffb600]">Running…</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer sync */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-8">
          <h2 className="font-bold text-[#1a1d26] mb-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Customer Sync
          </h2>
          <p className="text-sm text-[#5f6980] mb-4">
            Matches portal sign-ups to MarketTime customers by email. Sets retailer ID and approval status automatically.
          </p>
          <button
            onClick={handleCustomerSync}
            disabled={customerSyncing}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg, #8cc63f, #a8d96a)' }}
          >
            {customerSyncing ? 'Syncing…' : 'Sync customers now'}
          </button>

          {customerSyncResult?.success && (
            <div className="text-sm px-4 py-3 rounded-lg bg-green-50 text-green-800 mt-4">
              Linked {customerSyncResult.linkedProfiles} of {customerSyncResult.supabaseUsers} users
              ({customerSyncResult.matchedByEmail} matched by email, {customerSyncResult.unmatchedUsers} unmatched)
            </div>
          )}
        </div>

        <CustomerUploadPanel defaultSalespersonId={defaultSalespersonId} />

        {/* User management */}
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <h2 className="font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Users ({profiles.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#f7f8fa]">
                  {['Email', 'Company', 'Retailer ID', 'Approved', 'Joined'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#5f6980] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-black/[0.04] hover:bg-[#f7f8fa] transition-colors">
                    <td className="px-4 py-3 text-[#1a1d26] font-medium">{profile.email}</td>
                    <td className="px-4 py-3 text-[#5f6980]">{profile.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editing[profile.id] ?? profile.retailer_id ?? ''}
                          onChange={(e) => handleRetailerIdChange(profile.id, e.target.value)}
                          placeholder="B123456"
                          className="w-28 px-2 py-1 border border-gray-200 rounded text-xs font-mono focus:outline-none focus:border-[#f15a24]"
                        />
                        {editing[profile.id] !== undefined && editing[profile.id] !== (profile.retailer_id ?? '') && (
                          <button
                            onClick={() => handleRetailerIdSave(profile.id)}
                            className="text-xs font-semibold text-white px-2 py-1 rounded"
                            style={{ background: '#f15a24' }}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleApproved(profile.id, profile.approved)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                          profile.approved
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {profile.approved ? 'Approved' : 'Pending'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#5f6980] text-xs">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
