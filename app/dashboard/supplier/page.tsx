import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

const MATERIAL_QUOTE_SELECT =
  'id, description, status, supplier_response, master_response, created_at, updated_at, contractor_id, quote_session_id, layout_drawing_id, attachment_url, attachment_name, attachment_content_type, attachment_size_bytes, supplier_seen_at';

function formatDateShort(iso: string): string {
  const d = new Date(iso);
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

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'quoted') return 'Quoted';
  if (s === 'closed') return 'Closed';
  return status;
}

type LinkedContractorRow = {
  link_id: string;
  linked_at: string;
  contractor: { id: string; company_name: string; slug: string | null; logo_url: string | null };
};

export default async function SupplierDashboardHomePage() {
  await requireSupplierDashboard();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  const supplierId = userRow?.contractor_id;
  if (!supplierId) redirect('/dashboard');

  const [
    { data: supplierCo },
    linksResult,
    recentRowsResult,
    unreadHead,
    pendingHead,
    totalHead,
  ] = await Promise.all([
    supabase.from('contractors').select('company_name, slug, logo_url').eq('id', supplierId).single(),
    supabase
      .from('contractor_supplier_links')
      .select('id, contractor_id, created_at')
      .eq('supplier_contractor_id', supplierId)
      .order('created_at', { ascending: false }),
    supabase
      .from('material_quote_requests')
      .select(MATERIAL_QUOTE_SELECT)
      .eq('supplier_contractor_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('material_quote_requests')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_contractor_id', supplierId)
      .is('supplier_seen_at', null),
    supabase
      .from('material_quote_requests')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_contractor_id', supplierId)
      .eq('status', 'pending'),
    supabase
      .from('material_quote_requests')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_contractor_id', supplierId),
  ]);

  const links = linksResult.data ?? [];
  const contractorIds = Array.from(new Set(links.map((l) => l.contractor_id)));

  let linkedContractors: LinkedContractorRow[] = [];
  if (contractorIds.length > 0) {
    const { data: companies } = await supabase
      .from('contractors')
      .select('id, company_name, slug, logo_url')
      .in('id', contractorIds);
    const byId = new Map((companies ?? []).map((c) => [c.id, c]));
    linkedContractors = links.map((l) => ({
      link_id: l.id,
      linked_at: l.created_at,
      contractor: byId.get(l.contractor_id) || {
        id: l.contractor_id,
        company_name: 'Unknown',
        slug: null,
        logo_url: null,
      },
    }));
  }

  const recentRows = recentRowsResult.data ?? [];
  const recentQuotes =
    recentRows.length > 0 ? await enrichMaterialQuoteRequests(supabase, recentRows) : [];

  const unreadCount = unreadHead.count ?? 0;
  const pendingCount = pendingHead.count ?? 0;
  const totalQuotes = totalHead.count ?? 0;
  const linkedCount = linkedContractors.length;

  const quotePageUrl = supplierCo?.slug ? `/estimate/${supplierCo.slug}/contact` : null;

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.14), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.06))',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--dashboard-brand-rgb) / 0.38), transparent)' }}
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--dashboard-ink)]"
              style={{ background: 'var(--dashboard-soft)' }}
            >
              Supplier dashboard
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {supplierCo?.company_name ? (
                <>
                  <span className="text-slate-600">Hello, </span>
                  {supplierCo.company_name}
                </>
              ) : (
                'Supplier dashboard'
              )}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Linked contractors send material layout requests here. Review new quotes, manage relationships, and use your
              sheet calculator—all in one place. Your contractor-facing tools stay in the sidebar under{' '}
              <span className="font-medium text-slate-800">Contractor workspace</span>.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Link
              href="/dashboard/supplier/contractor-quotes"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
              style={{
                background: 'var(--dashboard-brand)',
                boxShadow: '0 10px 24px rgb(var(--dashboard-brand-rgb) / 0.22)',
              }}
            >
              Material requests
              {unreadCount > 0 ? (
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold tabular-nums">{unreadCount}</span>
              ) : null}
            </Link>
            <Link
              href="/dashboard/supplier/contractor-management"
              className="inline-flex items-center justify-center rounded-xl border bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
              style={{ borderColor: 'var(--dashboard-line)' }}
            >
              Contractors ({linkedCount})
            </Link>
            <Link
              href="/dashboard/supplier/embedded-calculator"
              className="inline-flex items-center justify-center rounded-xl border bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
              style={{ borderColor: 'var(--dashboard-line)' }}
            >
              Sheet calculator
            </Link>
            {quotePageUrl ? (
              <a
                href={quotePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
                style={{ borderColor: 'var(--dashboard-line)' }}
              >
                Public quote page
                <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className={`rounded-2xl border p-5 shadow-sm ${unreadCount > 0 ? 'ring-1' : ''}`}
          style={
            unreadCount > 0
              ? {
                  borderColor: 'var(--dashboard-line)',
                  background: 'linear-gradient(135deg, var(--dashboard-soft-strong), rgb(255 255 255 / 0.98))',
                }
              : { borderColor: 'var(--dashboard-line)', background: 'rgb(255 255 255 / 0.98)' }
          }
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New requests</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{unreadCount}</p>
          <p className="mt-1 text-sm text-slate-600">Not opened yet</p>
        </div>
        <div
          className="rounded-2xl border bg-white p-5 shadow-sm"
          style={{
            borderColor: 'var(--dashboard-line)',
            background: 'linear-gradient(180deg, rgb(var(--dashboard-brand-rgb) / 0.06), rgb(255 255 255 / 0.98) 40%)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting quote</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{pendingCount}</p>
          <p className="mt-1 text-sm text-slate-600">Status: pending</p>
        </div>
        <div
          className="rounded-2xl border bg-white p-5 shadow-sm"
          style={{
            borderColor: 'var(--dashboard-line)',
            background: 'linear-gradient(180deg, rgb(var(--dashboard-brand-rgb) / 0.06), rgb(255 255 255 / 0.98) 40%)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total requests</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{totalQuotes}</p>
          <p className="mt-1 text-sm text-slate-600">All time</p>
        </div>
        <div
          className="rounded-2xl border bg-white p-5 shadow-sm"
          style={{
            borderColor: 'var(--dashboard-line)',
            background: 'linear-gradient(180deg, rgb(var(--dashboard-brand-rgb) / 0.06), rgb(255 255 255 / 0.98) 40%)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked contractors</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{linkedCount}</p>
          <p className="mt-1 text-sm text-slate-600">Active relationships</p>
        </div>
      </div>

      {/* Main grid: recent quotes + contractors */}
      <div className="mt-10 grid gap-8 lg:grid-cols-5 lg:gap-10">
        <section className="lg:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent material requests</h2>
              <p className="mt-1 text-sm text-slate-600">Latest layout requests from your contractors.</p>
            </div>
            <Link
              href="/dashboard/supplier/contractor-quotes"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              View all →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentQuotes.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed px-6 py-14 text-center"
                style={{ borderColor: 'var(--dashboard-line)', background: 'rgb(248 250 252 / 0.9)' }}
              >
                <p className="font-semibold text-slate-900">No material requests yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                  When a linked contractor sends a layout from a lead or the Draw page, it will appear here and in Material
                  requests.
                </p>
                <Link
                  href="/dashboard/supplier/contractor-management"
                  className="mt-5 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Manage linked contractors
                </Link>
              </div>
            ) : (
              recentQuotes.map((q) => {
                const title = q.project?.design_summary || 'Material request';
                const ft = Math.round(Number(q.project?.total_length_ft || 0));
                const isNew = !q.supplier_seen_at;
                return (
                  <Link
                    key={q.id}
                    href={`/dashboard/supplier/contractor-quotes/${q.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-200/90 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-700">
                        {companyInitials(q.contractor.company_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{q.contractor.company_name}</span>
                          {isNew ? (
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                              New
                            </span>
                          ) : null}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {statusLabel(q.status)}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-slate-800">{title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{q.description || '—'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:w-40 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                      <p className="text-sm tabular-nums text-slate-700">
                        {ft} ft{q.project?.has_removal ? ' · Removal' : ''}
                      </p>
                      <p className="text-xs text-slate-400">{formatDateShort(q.created_at)}</p>
                      <span className="hidden text-slate-300 group-hover:text-indigo-500 sm:block" aria-hidden>
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
        </section>

        <section className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your contractors</h2>
              <p className="mt-1 text-sm text-slate-600">Companies linked to you as their supplier.</p>
            </div>
            <Link
              href="/dashboard/supplier/contractor-management"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Manage →
            </Link>
          </div>

          <div
            className="mt-4 space-y-2 rounded-2xl border p-4 shadow-sm sm:p-5"
            style={{ borderColor: 'var(--dashboard-line)', background: 'rgb(255 255 255 / 0.98)' }}
          >
            {linkedContractors.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-900">No contractors linked yet</p>
                <p className="mx-auto mt-2 max-w-xs text-xs text-slate-600">
                  Contractors add you from their Suppliers page. Share your supplier profile or wait for them to connect.
                </p>
                <Link
                  href="/dashboard/supplier/contractor-management"
                  className="mt-4 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Open contractor management
                </Link>
              </div>
            ) : (
              linkedContractors.slice(0, 8).map((row) => (
                <div
                  key={row.link_id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition hover:border-slate-200 hover:bg-white"
                >
                  {row.contractor.logo_url ? (
                    <img
                      src={row.contractor.logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200/80 bg-white object-contain"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-600 ring-1 ring-slate-200/80">
                      {companyInitials(row.contractor.company_name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.contractor.company_name}</p>
                    <p className="text-xs text-slate-500">Linked {formatDateShort(row.linked_at)}</p>
                  </div>
                </div>
              ))
            )}
            {linkedContractors.length > 8 ? (
              <p className="pt-2 text-center text-xs text-slate-500">
                +{linkedContractors.length - 8} more —{' '}
                <Link href="/dashboard/supplier/contractor-management" className="font-semibold text-indigo-600 hover:text-indigo-500">
                  see all
                </Link>
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Quick tools */}
      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick tools</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          <li>
            <Link
              href="/dashboard/supplier/contractor-quotes"
              className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">Material requests</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">Full list, search, and respond to each layout request.</p>
              <span className="mt-4 text-sm font-semibold text-indigo-600">Open →</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/supplier/contractor-management"
              className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">Contractor management</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">View or remove linked contractor companies.</p>
              <span className="mt-4 text-sm font-semibold text-indigo-600">Open →</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/supplier/embedded-calculator"
              className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">Sheet calculator</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">
                Embed Google Sheets or Excel; saved links are shared with everyone on your supplier account.
              </p>
              <span className="mt-4 text-sm font-semibold text-indigo-600">Open →</span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
