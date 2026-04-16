'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { LeadStatusPieChart } from '@/components/LeadStatusPieChart';

type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year';

interface AnalyticsData {
  period: string;
  lead_count: number;
  value_low: number;
  value_high: number;
  lead_status_breakdown: Record<string, number>;
}

interface CustomerRow {
  id: string;
  status: string;
  current_step: string;
  contractor_viewed_at: string | null;
  first_name: string;
  last_name: string;
  last_active_at: string;
  total_length_ft: number | null;
  subtotal_low: number | null;
  subtotal_high: number | null;
  total_low: number | null;
  total_high: number | null;
}

interface MeResponse {
  company_name?: string;
  slug?: string;
  user_role?: string;
  account_type?: string;
  logo_url?: string | null;
}

const ADMIN_ROLES = ['owner', 'admin'];

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

function formatDate(s: string): string {
  const d = new Date(s);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatValueRange(low: number, high: number): string {
  if (low === high && low === 0) return '—';
  const fmt = (n: number) =>
    n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `$${fmt(low)}–$${fmt(high)}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className ?? ''}`} />;
}

export function DashboardOverview() {
  const [recent, setRecent] = useState<CustomerRow[]>([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contractor, setContractor] = useState<MeResponse | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (cancelled) return;

      Promise.all([fetch('/api/contractor/me'), fetch('/api/contractor/customers?limit=5&unviewed_count=1')])
        .then(async ([meRes, custRes]) => {
          const me = meRes.ok ? ((await meRes.json()) as MeResponse) : {};
          const cust = custRes.ok ? await custRes.json() : {};
          if (cancelled) return;
          setContractor(meRes.ok ? me : null);
          setIsAdmin(ADMIN_ROLES.includes(me?.user_role || ''));
          setRecent(cust.customers || []);
          setUnviewedCount(cust.unviewed_count ?? 0);
        })
        .catch(() => {
          if (!cancelled) {
            setRecent([]);
            setUnviewedCount(0);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    fetch(`/api/contractor/analytics?period=${analyticsPeriod}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsPeriod]);

  const valueLabel = useMemo(() => {
    if (!analytics) return '—';
    return formatValueRange(analytics.value_low, analytics.value_high);
  }, [analytics]);

  const quotePageUrl = contractor?.slug ? `/estimate/${contractor.slug}/contact` : null;
  const isSupplierAccount = contractor?.account_type === 'supplier';

  return (
    <div className="mx-auto w-full max-w-6xl pb-4">
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.16), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.06))',
        }}
      >
        {contractor?.logo_url ? (
          <img
            src={contractor.logo_url}
            alt=""
            className="pointer-events-none absolute right-4 top-4 hidden h-20 w-20 object-contain opacity-[0.08] sm:block"
          />
        ) : null}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-ink)]" style={{ background: 'var(--dashboard-soft)' }}>
              Overview
            </p>
            {isSupplierAccount && (
              <Link
                href="/dashboard/supplier"
                className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-800 hover:bg-indigo-200/80"
              >
                Supplier home
              </Link>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {contractor?.company_name ? (
              <>
                <span className="text-slate-500">Hi, </span>
                {contractor.company_name}
              </>
            ) : (
              'Your workspace'
            )}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            {isSupplierAccount ? (
              <>
                Contractor-style leads, pipeline, and quote tools. Supplier-only shortcuts live on{' '}
                <Link href="/dashboard/supplier" className="font-semibold text-blue-600 hover:text-blue-500">
                  supplier home
                </Link>
                .
              </>
            ) : (
              <>
                Leads, pipeline value, and shortcuts in one place. Open your public quote page anytime to test what
                customers see.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
            style={{ background: 'var(--dashboard-brand)', boxShadow: '0 10px 24px rgb(var(--dashboard-brand-rgb) / 0.22)' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
            All leads
          </Link>
          {quotePageUrl && (
            <a
              href={quotePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
              style={{ borderColor: 'var(--dashboard-line)' }}
            >
              Quote page
              <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
          <Link
            href="/dashboard/products"
            className="inline-flex items-center justify-center rounded-xl border bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
            style={{ borderColor: 'var(--dashboard-line)' }}
          >
            Products
          </Link>
        </div>
      </div>
      </div>

      {/* KPI strip */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/customers"
          className={`block rounded-2xl border p-5 shadow-sm outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            unviewedCount > 0
              ? 'ring-1 hover:shadow-md'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-sm'
          }`}
          style={
            unviewedCount > 0
              ? {
                  borderColor: 'var(--dashboard-line)',
                  background: 'linear-gradient(135deg, var(--dashboard-soft-strong), rgb(255 255 255 / 0.98))',
                  boxShadow: '0 10px 30px rgb(var(--dashboard-brand-rgb) / 0.10)',
                }
              : undefined
          }
          aria-label={
            loading
              ? 'Open leads'
              : unviewedCount > 0
                ? `Open leads — ${unviewedCount} new or unviewed quotes`
                : 'Open leads — no unviewed quotes'
          }
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs attention</p>
          {loading ? (
            <Skeleton className="mt-3 h-9 w-16" />
          ) : (
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{unviewedCount}</p>
          )}
          <p className="mt-1 text-sm text-slate-600">New or unviewed leads</p>
        </Link>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm" style={{ borderColor: 'var(--dashboard-line)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leads ({analyticsPeriod})</p>
          {analyticsLoading ? (
            <Skeleton className="mt-3 h-9 w-20" />
          ) : (
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{analytics?.lead_count ?? '—'}</p>
          )}
          <p className="mt-1 text-sm text-slate-600">In selected period</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm" style={{ borderColor: 'var(--dashboard-line)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline (est.)</p>
          {analyticsLoading ? (
            <Skeleton className="mt-3 h-9 w-32" />
          ) : (
            <p className="mt-2 text-2xl font-bold tabular-nums leading-tight text-slate-900 sm:text-3xl">{valueLabel}</p>
          )}
          <p className="mt-1 text-sm text-slate-600">CAD, from quotes</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Analytics */}
        <section className="lg:col-span-7 xl:col-span-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Performance</h2>
                <p className="mt-1 text-sm text-slate-600">Lead volume and estimated quote value</p>
              </div>
              <div
                className="inline-flex rounded-xl bg-slate-100/90 p-1 shadow-inner"
                role="tablist"
                aria-label="Analytics period"
              >
                {PERIODS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={analyticsPeriod === id}
                    onClick={() => setAnalyticsPeriod(id)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      analyticsPeriod === id
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {analyticsLoading ? (
              <div className="mt-8 space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="mx-auto h-48 w-48 rounded-full" />
              </div>
            ) : analytics ? (
              <div className="mt-8 space-y-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-5 py-4">
                    <p className="text-sm font-medium text-slate-500">Leads received</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{analytics.lead_count}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-5 py-4">
                    <p className="text-sm font-medium text-slate-500">Total value (CAD)</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valueLabel}</p>
                  </div>
                </div>
                {analytics.lead_status_breakdown && (
                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-sm font-semibold text-slate-900">Status mix</h3>
                    <p className="mt-0.5 text-sm text-slate-600">How leads are distributed in this period</p>
                    <div className="mt-6">
                      <LeadStatusPieChart breakdown={analytics.lead_status_breakdown} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-8 text-sm text-slate-500">Could not load analytics.</p>
            )}
          </div>
        </section>

        {/* Recent + shortcuts column */}
        <div className="flex flex-col gap-8 lg:col-span-5 xl:col-span-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Recent leads</h2>
                {unviewedCount > 0 && (
                  <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                    {unviewedCount}
                  </span>
                )}
              </div>
              <Link
                href="/dashboard/customers"
                className="shrink-0 text-sm font-semibold text-blue-600 transition hover:text-blue-500"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recent.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-800">No submissions yet</p>
                <p className="mx-auto mt-2 max-w-xs text-sm text-slate-600">
                  When homeowners use your quote link, they will show up here instantly.
                </p>
                {quotePageUrl && (
                  <a
                    href={quotePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-500"
                  >
                    Open your quote page →
                  </a>
                )}
              </div>
            ) : (
              <ul className="mt-6 space-y-2">
                {recent.map((c) => {
                  const estimate =
                    c.total_low != null && c.total_high != null
                      ? `$${c.total_low.toLocaleString('en-CA', { maximumFractionDigits: 0 })}–$${c.total_high.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`
                      : c.subtotal_low != null && c.subtotal_high != null
                        ? `$${c.subtotal_low.toLocaleString('en-CA', { maximumFractionDigits: 0 })}–$${c.subtotal_high.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`
                        : null;
                  const initial = `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.trim() || '?';
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50/80"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {initial}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {c.first_name} {c.last_name}
                            </span>
                            {!c.contractor_viewed_at && (
                              <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-sm text-slate-600">
                            {c.total_length_ft != null ? `${c.total_length_ft.toFixed(0)} ft` : 'No length yet'}
                            {estimate && ` · ${estimate}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-500">{formatDate(c.last_active_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Shortcuts</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {isAdmin && (
                <>
                  <Link
                    href="/dashboard/settings"
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-200/80 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Company & branding</p>
                      <p className="mt-0.5 text-sm text-slate-600">Logo, colors, business details</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/sales-team"
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-200/80 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Sales team</p>
                      <p className="mt-0.5 text-sm text-slate-600">Thank-you page & lead routing</p>
                    </div>
                  </Link>
                </>
              )}
              <Link
                href="/dashboard/products"
                className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-200/80 hover:shadow-md sm:col-span-2 lg:col-span-1"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Products & pricing</p>
                  <p className="mt-0.5 text-sm text-slate-600">Types, styles, and quote rules</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
