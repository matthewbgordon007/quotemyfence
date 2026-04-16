'use client';

import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MaterialReq = MaterialQuoteRequestDto;

function formatDateShort(s: string): string {
  const d = new Date(s);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  const t = name.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t[0]?.toUpperCase() || '?';
}

export function ContractorQuotesClient() {
  const [requests, setRequests] = useState<MaterialReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = requests.filter((r) => !r.supplier_seen_at).length;

  const load = useCallback(async () => {
    const rq = await fetch('/api/supplier/material-quote-requests', { credentials: 'include' });
    const rj = await rq.json();
    if (rq.ok) setRequests(rj.requests || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const blob = [
        r.contractor.company_name,
        r.project?.design_summary,
        r.description,
        r.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [requests, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.14), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.05))',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Supplier workspace</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Contractor quotes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Material layout requests from contractors. Each row is a short summary—open one for the full drawing, specs, and
          your response. Use <span className="font-medium text-slate-800">Sheet calculator + quote</span> on the detail page
          to work beside your embedded sheet.
        </p>
        {unreadCount > 0 && (
          <p className="mt-3 inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            {unreadCount} new material request{unreadCount === 1 ? '' : 's'}
          </p>
        )}
        <Link
          href="/dashboard/supplier"
          className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-500"
        >
          ← Supplier home
        </Link>
      </div>

      <div
        className="mt-8 rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm"
        style={{ borderColor: 'var(--dashboard-line)' }}
      >
        <label htmlFor="mq-search" className="sr-only">
          Search contractor quotes
        </label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="mq-search"
            type="search"
            placeholder="Search contractor, design, notes, status…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
            <p className="text-base font-semibold text-slate-900">
              {searchQuery.trim() ? 'No matches' : 'No requests yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {searchQuery.trim()
                ? 'Try another search or clear the box to see all requests.'
                : 'When linked contractors send a material layout request, it will show up here.'}
            </p>
          </div>
        ) : (
          filtered.map((req) => {
            const title = req.project?.design_summary || 'Material request';
            const ft = Math.round(Number(req.project?.total_length_ft || 0));
            const metaParts = [
              `${ft} ft`,
              req.project?.has_removal ? 'Removal' : null,
              req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : null,
            ].filter(Boolean);

            return (
              <Link
                key={req.id}
                href={`/dashboard/supplier/contractor-quotes/${req.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-200/80 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-700">
                    {companyInitials(req.contractor.company_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{req.contractor.company_name}</span>
                      {!req.supplier_seen_at ? (
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">New</span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-medium text-slate-800">{title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{req.description || '—'}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-slate-900">Material request</p>
                    <p className="mt-0.5 text-xs text-slate-500">{metaParts.join(' · ')}</p>
                    <p className="mt-1 hidden text-xs text-slate-400 sm:block">{formatDateShort(req.created_at)}</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition group-hover:bg-slate-50 group-hover:text-indigo-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
