'use client';

import { useEffect, useMemo, useState } from 'react';

type HelpRequest = {
  id: string;
  quoteSessionId: string | null;
  contractorId: string | null;
  contractorName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string;
  pageUrl: string | null;
  status: string;
  createdAt: string | null;
};

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MasterHelpRequestsPage() {
  const [rows, setRows] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/master/help-requests', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRows([]);
      setLoadError(data.error || 'Could not load help requests.');
    } else {
      setLoadError(null);
      setRows(data.requests || []);
      setMigrationNeeded(data.migrationNeeded === true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: 'open' | 'resolved') {
    setUpdatingId(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await fetch('/api/master/help-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      // Revert on failure.
      await load();
    }
    setUpdatingId(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name || '', r.email || '', r.phone || '', r.message || '', r.contractorName || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const stats = useMemo(() => {
    const total = rows.length;
    const open = rows.filter((r) => r.status !== 'resolved').length;
    return { total, open, resolved: total - open };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}
      {migrationNeeded && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Help requests aren&apos;t set up yet. Run{' '}
          <code className="font-mono">supabase/help-requests.sql</code> once to create the{' '}
          <code className="font-mono">help_requests</code> table, then messages sent from the quote
          page will show up here.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Help requests</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Messages sent from the quote page when someone hit a problem.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--bg2)]"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Open', value: stats.open },
          { label: 'Resolved', value: stats.resolved },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, message, or company..."
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtered.map((row) => {
          const resolved = row.status === 'resolved';
          const name = row.name || 'Anonymous';
          return (
            <div
              key={row.id}
              className={
                'rounded-2xl border bg-white p-4 shadow-sm ' +
                (resolved ? 'border-[var(--line)] opacity-70' : 'border-[var(--line)]')
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{name}</span>
                    <span
                      className={
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                        (resolved ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800')
                      }
                    >
                      {resolved ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
                    {row.email && (
                      <a href={`mailto:${row.email}`} className="text-[var(--accent)] hover:underline">
                        {row.email}
                      </a>
                    )}
                    {row.phone && <span>{row.phone}</span>}
                    {row.contractorName && <span>via {row.contractorName}</span>}
                    <span>{formatWhen(row.createdAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={updatingId === row.id}
                  onClick={() => setStatus(row.id, resolved ? 'open' : 'resolved')}
                  className={
                    'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ' +
                    (resolved
                      ? 'border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--bg2)]'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100')
                  }
                >
                  {resolved ? 'Reopen' : 'Mark resolved'}
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[var(--bg2)] px-3 py-2.5 text-sm text-[var(--text)]">
                {row.message}
              </p>
              {row.pageUrl && (
                <div className="mt-2 truncate text-xs text-[var(--muted)]">
                  Page:{' '}
                  <a href={row.pageUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    {row.pageUrl}
                  </a>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-10 text-center text-[var(--muted)]">
            No help requests yet.
          </div>
        )}
      </div>
    </div>
  );
}
