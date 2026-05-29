'use client';

import { useEffect, useMemo, useState } from 'react';

type Demo = {
  id: string;
  status: string | null;
  currentStep: string | null;
  isFlagged: boolean;
  startedAt: string | null;
  lastActiveAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  leadSource: string | null;
  address: string | null;
};

const STAGE_BY_STATUS: Record<string, { label: string; step: number }> = {
  started: { label: 'Started', step: 1 },
  contact_saved: { label: 'Entered contact', step: 1 },
  address_saved: { label: 'Added address', step: 2 },
  drawing_saved: { label: 'Drew fence', step: 3 },
  design_saved: { label: 'Chose design', step: 4 },
  submitted: { label: 'Completed demo', step: 6 },
  abandoned: { label: 'Abandoned', step: 0 },
};
const TOTAL_STEPS = 6;

function stageFor(status: string | null): { label: string; step: number } {
  return (status && STAGE_BY_STATUS[status]) || { label: status || 'Unknown', step: 0 };
}

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

export default function MasterDemosPage() {
  const [rows, setRows] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/master/demos', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRows([]);
      setLoadError(data.error || 'Could not load demos.');
    } else {
      setLoadError(null);
      setRows(data.demos || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.firstName || '', r.lastName || '', r.email || '', r.phone || '', r.address || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.status === 'submitted').length;
    const reachedDesign = rows.filter((r) => stageFor(r.status).step >= 4).length;
    return { total, completed, reachedDesign };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Demos</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            People who tried the public demo, and how far they got through the quote flow.
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
          { label: 'Total demos', value: stats.total },
          { label: 'Reached design', value: stats.reachedDesign },
          { label: 'Completed', value: stats.completed },
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
          placeholder="Search by name, email, phone, or address..."
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <table className="min-w-full divide-y divide-[var(--line)] text-sm">
          <thead className="bg-[var(--bg2)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Person</th>
              <th className="px-4 py-3 text-left font-semibold">Stage reached</th>
              <th className="px-4 py-3 text-left font-semibold">Address</th>
              <th className="px-4 py-3 text-left font-semibold">Started</th>
              <th className="px-4 py-3 text-left font-semibold">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filtered.map((row) => {
              const stage = stageFor(row.status);
              const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Anonymous';
              const pct = stage.step > 0 ? Math.round((stage.step / TOTAL_STEPS) * 100) : 0;
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{name}</div>
                    {row.email && <div className="text-xs text-[var(--muted)]">{row.email}</div>}
                    {row.phone && <div className="text-xs text-[var(--muted)]">{row.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                          (row.status === 'submitted'
                            ? 'bg-green-100 text-green-800'
                            : row.status === 'abandoned'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-blue-100 text-blue-800')
                        }
                      >
                        {stage.label}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-[var(--bg2)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{row.address || '—'}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatWhen(row.startedAt || row.createdAt)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatWhen(row.lastActiveAt)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--muted)]">
                  No demos yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
