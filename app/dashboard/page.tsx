'use client';

import { useState, useEffect } from 'react';
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
}

function formatDate(s: string): string {
  const d = new Date(s);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [recent, setRecent] = useState<CustomerRow[]>([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contractor/customers?limit=5&unviewed_count=1')
      .then((r) => r.json())
      .then((data) => {
        setRecent(data.customers || []);
        setUnviewedCount(data.unviewed_count ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setAnalyticsLoading(true);
    fetch(`/api/contractor/analytics?period=${analyticsPeriod}`)
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch(() => setAnalytics(null))
      .finally(() => setAnalyticsLoading(false));
  }, [analyticsPeriod]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome to your dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">
        Manage your company profile, products, and customer quotes.
      </p>

      <div className="mt-8 space-y-6">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Leads & value</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            All leads in the selected period
          </p>
          <div className="mt-4 flex gap-2">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAnalyticsPeriod(p)}
                className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                  analyticsPeriod === p
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg2)] text-[var(--muted)] hover:bg-[var(--line)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {analyticsLoading ? (
            <div className="mt-4 flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : analytics ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-2xl font-bold">{analytics.lead_count}</div>
                  <div className="text-sm text-[var(--muted)]">Leads received</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {analytics.value_low === analytics.value_high && analytics.value_low === 0
                      ? '—'
                      : `$${analytics.value_low.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}–$${analytics.value_high.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  </div>
                  <div className="text-sm text-[var(--muted)]">Total value (CAD)</div>
                </div>
              </div>
              {analytics.lead_status_breakdown && (
                <div className="border-t border-[var(--line)] pt-6">
                  <h3 className="mb-4 text-sm font-semibold text-[var(--muted)]">Lead status breakdown</h3>
                  <LeadStatusPieChart breakdown={analytics.lead_status_breakdown} />
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Recent customers</h2>
              {unviewedCount > 0 && (
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--accent)] px-2 text-xs font-bold text-white">
                  {unviewedCount}
                </span>
              )}
            </div>
            <Link
              href="/dashboard/customers"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="mt-4 flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No quote submissions yet. They’ll appear here when customers use your quote page.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg2)]/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Summary</th>
                    <th className="px-4 py-3 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/customers/${c.id}`}
                          className="flex items-center gap-2 font-medium text-[var(--text)] hover:text-[var(--accent)]"
                        >
                          {c.first_name} {c.last_name}
                          {!c.contractor_viewed_at && (
                            <span className="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 text-xs text-[var(--accent)]">
                              New
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {c.total_length_ft != null ? `${c.total_length_ft.toFixed(0)} ft` : '—'}
                        {c.subtotal_low != null && c.subtotal_high != null && (
                          <> • ${c.subtotal_low.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}–${c.subtotal_high.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--muted)]">
                        {formatDate(c.last_active_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/settings"
            className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm transition hover:border-[var(--accent)]/50"
          >
            <h2 className="font-semibold">Company & branding</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Logo, accent color, company info
            </p>
          </Link>
          <Link
            href="/dashboard/sales-team"
            className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm transition hover:border-[var(--accent)]/50"
          >
            <h2 className="font-semibold">Sales Team</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Team photos & contact info for thank-you page
            </p>
          </Link>
          <Link
            href="/dashboard/products"
            className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm transition hover:border-[var(--accent)]/50"
          >
            <h2 className="font-semibold">Products</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Fence types, heights, materials, pricing
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
