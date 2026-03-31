'use client';

import { useEffect, useMemo, useState } from 'react';

type Contractor = {
  id: string;
  company_name: string;
  email: string | null;
  slug: string | null;
  created_at: string | null;
  stripe_subscription_status: string | null;
  billing_access_override: boolean | null;
  billing_access_override_note: string | null;
};

export default function MasterContractorsPage() {
  const [rows, setRows] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/master/contractors', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    setRows(data.contractors || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.company_name, r.email || '', r.slug || ''].join(' ').toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function toggleOverride(row: Contractor, enabled: boolean) {
    setSavingId(row.id);
    try {
      const res = await fetch(`/api/master/contractors/${row.id}/billing-override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          note: row.billing_access_override_note || '',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, billing_access_override: enabled } : r))
      );
    } catch {
      alert('Failed to update free access.');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">Contractors</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Search contractor accounts and grant free access without billing.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company, email, or slug..."
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <table className="min-w-full divide-y divide-[var(--line)] text-sm">
          <thead className="bg-[var(--bg2)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Company</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Stripe status</th>
              <th className="px-4 py-3 text-left font-semibold">Free access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.company_name}</div>
                  <div className="text-xs text-[var(--muted)]">/{row.slug || '—'}</div>
                </td>
                <td className="px-4 py-3">{row.email || '—'}</td>
                <td className="px-4 py-3">{row.stripe_subscription_status || 'none'}</td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.billing_access_override === true}
                      disabled={savingId === row.id}
                      onChange={(e) => toggleOverride(row, e.target.checked)}
                    />
                    <span>{savingId === row.id ? 'Saving...' : 'Enabled'}</span>
                  </label>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                  No contractors match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

