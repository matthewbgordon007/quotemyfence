import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';
import { MATERIAL_QUOTE_REQUEST_SELECT } from '@/lib/supplier-material-quote-request-fields';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

type PageProps = { params: Promise<{ contractorId: string }> };

function formatAddress(c: {
  address_line_1: string | null;
  city: string | null;
  province_state: string | null;
  postal_zip: string | null;
  country: string | null;
}): string | null {
  const parts = [c.address_line_1, [c.city, c.province_state].filter(Boolean).join(', ') || null, c.postal_zip, c.country].filter(
    Boolean,
  ) as string[];
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'quoted') return 'Quoted';
  if (s === 'closed') return 'Closed';
  return status;
}

function websiteHref(url: string | null): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
}

export default async function LinkedContractorDetailPage({ params }: PageProps) {
  await requireSupplierDashboard();
  const { contractorId } = await params;
  if (!contractorId) notFound();

  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) notFound();

  const { data: link } = await supabase
    .from('contractor_supplier_links')
    .select('id, created_at')
    .eq('supplier_contractor_id', sess.contractorId)
    .eq('contractor_id', contractorId)
    .maybeSingle();

  if (!link) notFound();

  const { data: c, error: cErr } = await supabase
    .from('contractors')
    .select(
      'id, company_name, slug, email, phone, website, logo_url, address_line_1, city, province_state, postal_zip, country'
    )
    .eq('id', contractorId)
    .single();

  if (cErr || !c) notFound();

  const { data: rows } = await supabase
    .from('material_quote_requests')
    .select(MATERIAL_QUOTE_REQUEST_SELECT)
    .eq('supplier_contractor_id', sess.contractorId)
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false });

  const quotes = await enrichMaterialQuoteRequests(supabase, rows || []);
  const addressLine = formatAddress(c);
  const web = websiteHref(c.website);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/supplier/contractor-management"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Contractor management
        </Link>
        <span className="text-slate-300">/</span>
        <span className="truncate text-sm font-medium text-slate-500">{c.company_name}</span>
      </div>

      <div
        className="overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.12), rgb(255 255 255 / 0.98) 40%, rgb(var(--dashboard-brand-rgb) / 0.05))',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {c.logo_url ? (
            <img
              src={c.logo_url}
              alt={c.company_name}
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200/80 bg-white object-contain sm:h-20 sm:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-600 sm:h-20 sm:w-20">
              {(c.company_name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Linked contractor</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{c.company_name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Linked to your supplier account on{' '}
              <time dateTime={link.created_at}>{new Date(link.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</time>
              .
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Contact &amp; web</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-sm">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="font-medium text-indigo-600 hover:underline">
                  {c.email}
                </a>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
            <dd className="mt-1 text-sm">
              {c.phone ? (
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="font-medium text-indigo-600 hover:underline">
                  {c.phone}
                </a>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</dt>
            <dd className="mt-1 text-sm">
              {web ? (
                <a href={web} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                  {c.website?.trim() || web}
                </a>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </dd>
          </div>
          {addressLine ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</dt>
              <dd className="mt-1 text-sm text-slate-800">{addressLine}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Material requests</h2>
            <p className="mt-1 text-sm text-slate-600">
              Layout and material quote requests this contractor has sent to you (newest first).
            </p>
          </div>
          <Link href="/dashboard/supplier/contractor-quotes" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            All contractor quotes →
          </Link>
        </div>

        {quotes.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">No material requests from this contractor yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100">
            {quotes.map((q) => {
              const title = q.project?.design_summary || 'Material request';
              const ft = Math.round(Number(q.project?.total_length_ft || 0));
              return (
                <li key={q.id} className="py-4 first:pt-0">
                  <Link
                    href={`/dashboard/supplier/contractor-quotes/${q.id}`}
                    className="group flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-700">{title}</span>
                        {!q.supplier_seen_at ? (
                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">New</span>
                        ) : null}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {statusLabel(q.status)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{q.description}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {ft} ft
                        {q.project?.has_removal ? ' · Removal' : ''}
                        {' · '}
                        {new Date(q.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-indigo-600 group-hover:text-indigo-500">View →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
