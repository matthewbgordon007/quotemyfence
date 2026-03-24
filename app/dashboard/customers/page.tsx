'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NewLeadModal } from '@/components/dashboard/NewLeadModal';

interface CustomerRow {
  id: string;
  status: string;
  current_step: string;
  lead_status: string;
  started_at: string;
  last_active_at: string;
  contractor_viewed_at: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  total_length_ft: number | null;
  has_removal: boolean | null;
  subtotal_low: number | null;
  subtotal_high: number | null;
  total_low: number | null;
  total_high: number | null;
}

interface MeResponse {
  slug?: string;
  company_name?: string;
}

function stepLabel(step: string, status: string): string {
  if (status === 'submitted') return 'Submitted';
  if (status === 'abandoned') return 'Abandoned';
  const labels: Record<string, string> = {
    contact: 'Contact only',
    location: 'Address',
    draw: 'Drawing',
    design: 'Design',
    review: 'Review',
  };
  return labels[step] ?? step;
}

function formatDateFull(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(s: string): string {
  const d = new Date(s);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className ?? ''}`} />;
}

function estimateLabel(c: CustomerRow): string | null {
  if (c.total_low != null && c.total_high != null) {
    const lo = c.total_low.toLocaleString('en-CA', { maximumFractionDigits: 0 });
    const hi = c.total_high.toLocaleString('en-CA', { maximumFractionDigits: 0 });
    return `$${lo}–$${hi}`;
  }
  if (c.subtotal_low != null && c.subtotal_high != null) {
    const lo = c.subtotal_low.toLocaleString('en-CA', { maximumFractionDigits: 0 });
    const hi = c.subtotal_high.toLocaleString('en-CA', { maximumFractionDigits: 0 });
    return `$${lo}–$${hi}`;
  }
  return null;
}

const STATUS_TABS = [
  { value: 'new' as const, label: 'Needs follow-up', short: 'Follow-up' },
  { value: 'contacted' as const, label: 'Contacted', short: 'Contacted' },
  { value: 'quoted' as const, label: 'Quoted', short: 'Quoted' },
  { value: 'won' as const, label: 'Won', short: 'Won' },
  { value: 'lost' as const, label: 'Lost', short: 'Lost' },
  { value: 'all' as const, label: 'All', short: 'All' },
];

type LeadFilter = (typeof STATUS_TABS)[number]['value'];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewLead, setShowNewLead] = useState(false);
  const [contractor, setContractor] = useState<MeResponse | null>(null);
  const firstLoadDone = useRef(false);

  const customersUrl = useCallback((filter: LeadFilter) => {
    const params = new URLSearchParams();
    params.set('unviewed_count', '1');
    if (filter !== 'all') params.set('lead_filter', filter);
    return `/api/contractor/customers?${params.toString()}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/contractor/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((me: MeResponse) => {
        if (!cancelled) setContractor(me);
      })
      .catch(() => {
        if (!cancelled) setContractor(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isFirst = !firstLoadDone.current;
    if (isFirst) setLoading(true);
    else setRefreshing(true);

    fetch(customersUrl(leadFilter), { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .then((data: { customers?: CustomerRow[]; counts?: Record<string, number>; unviewed_count?: number }) => {
        if (cancelled) return;
        setCustomers(data.customers || []);
        if (data.counts) setCounts(data.counts);
        if (typeof data.unviewed_count === 'number') setUnviewedCount(data.unviewed_count);
      })
      .catch(() => {
        if (!cancelled) {
          setCustomers([]);
        }
      })
      .finally(() => {
        if (cancelled) return;
        firstLoadDone.current = true;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leadFilter, customersUrl]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      const address = (c.address || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return fullName.includes(q) || address.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [customers, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val && leadFilter !== 'all') {
      setLeadFilter('all');
    }
  };

  const quotePageUrl = contractor?.slug ? `/estimate/${contractor.slug}/contact` : null;
  const newInView = useMemo(() => filteredCustomers.filter((c) => !c.contractor_viewed_at).length, [filteredCustomers]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full max-w-2xl rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-8">
      <NewLeadModal
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onCreated={(id) => router.push(`/dashboard/customers/${id}`)}
      />

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Pipeline</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Leads</h1>
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Updating…
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Quote submissions and leads you add manually. Filter by stage, search by name or contact details, then open a
            row for the full quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNewLead(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New lead
          </button>
          {quotePageUrl && (
            <a
              href={quotePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Quote page
              <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Overview
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div
          className={`rounded-2xl border p-5 shadow-sm transition-shadow ${
            unviewedCount > 0
              ? 'border-blue-200/80 bg-gradient-to-br from-blue-50/90 to-white ring-1 ring-blue-100'
              : 'border-slate-200/80 bg-white'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unviewed</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{unviewedCount}</p>
          <p className="mt-1 text-sm text-slate-600">New since you last opened them</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In this list</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{filteredCustomers.length}</p>
          <p className="mt-1 text-sm text-slate-600">
            {searchQuery.trim() ? 'After search' : STATUS_TABS.find((t) => t.value === leadFilter)?.label ?? 'Filtered'}
            {searchQuery.trim() && newInView > 0 && (
              <span className="text-slate-500">
                {' '}
                · <span className="font-medium text-blue-700">{newInView}</span> unviewed
              </span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total leads</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{counts.all ?? '—'}</p>
          <p className="mt-1 text-sm text-slate-600">All time in your account</p>
        </div>
      </div>

      {/* Filters + search */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <div
            className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin] sm:mx-0"
            role="tablist"
            aria-label="Lead status"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={leadFilter === tab.value}
                onClick={() => setLeadFilter(tab.value)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  leadFilter === tab.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                {counts[tab.value] !== undefined && (
                  <span
                    className={`ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                      leadFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {counts[tab.value]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="lead-search"
            type="search"
            placeholder="Search name, email, phone, address…"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* List */}
      <div className="mt-6 space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
            <p className="text-base font-semibold text-slate-900">
              {searchQuery.trim() ? 'No matches' : 'Nothing in this view yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {searchQuery.trim()
                ? 'Try another search or clear the box to see everyone in this filter.'
                : 'When homeowners use your public quote link, they appear here. You can also add leads manually.'}
            </p>
            {!searchQuery.trim() && quotePageUrl && (
              <a
                href={quotePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-500"
              >
                Open quote page
                <span aria-hidden>→</span>
              </a>
            )}
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const initial = `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.trim() || '?';
            const est = estimateLabel(c);
            const lengthPart =
              c.total_length_ft != null ? `${c.total_length_ft.toFixed(0)} ft` : null;
            const metaParts = [lengthPart, c.has_removal ? 'Removal' : null, est].filter(Boolean);

            return (
              <Link
                key={c.id}
                href={`/dashboard/customers/${c.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-200/80 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-700">
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {c.first_name} {c.last_name}
                      </span>
                      {!c.contractor_viewed_at && (
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">New</span>
                      )}
                      {c.lead_status !== 'new' && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {STATUS_TABS.find((t) => t.value === c.lead_status)?.label ?? c.lead_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {c.email || '—'}
                      {c.phone && <span className="text-slate-400"> · </span>}
                      {c.phone}
                    </p>
                    {c.address && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500 sm:line-clamp-1" title={c.address}>
                        {c.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-slate-900">{stepLabel(c.current_step ?? '', c.status)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {metaParts.length > 0 ? metaParts.join(' · ') : '—'}
                    </p>
                    <p className="mt-1 hidden text-xs text-slate-400 sm:block" title={formatDateFull(c.last_active_at)}>
                      {formatDateShort(c.last_active_at)}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition group-hover:bg-slate-50 group-hover:text-blue-600">
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
