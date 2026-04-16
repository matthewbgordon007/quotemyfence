import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

const supplierToolCards = [
  {
    href: '/dashboard/supplier/contractor-quotes',
    title: 'Contractor quotes',
    description: 'Quote intake, status, and responses from contractors.',
  },
  {
    href: '/dashboard/supplier/contractor-management',
    title: 'Contractor management',
    description: 'Relationships, onboarding, and permissions.',
  },
  {
    href: '/dashboard/supplier/embedded-calculator',
    title: 'My sheet calculator',
    description: 'Embed your Google Sheet or Excel workbook and work from it in the dashboard.',
  },
];

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
  const { data: contractor } = userRow?.contractor_id
    ? await supabase.from('contractors').select('company_name, slug').eq('id', userRow.contractor_id).single()
    : { data: null };
  const unreadRequests = userRow?.contractor_id
    ? await supabase
        .from('material_quote_requests')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_contractor_id', userRow.contractor_id)
        .is('supplier_seen_at', null)
    : { count: 0 };

  const quotePageUrl = contractor?.slug ? `/estimate/${contractor.slug}/contact` : null;
  const unreadCount = unreadRequests.count ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="border-b border-slate-200/80 pb-8">
        <p className="text-sm font-medium text-indigo-600">Supplier workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {contractor?.company_name ? (
            <>
              <span className="text-slate-600">Welcome — </span>
              {contractor.company_name}
            </>
          ) : (
            'Supplier home'
          )}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Supplier tools only on this page. Use <span className="font-medium text-slate-800">Contractor workspace</span>{' '}
          in the sidebar for leads, quotes, and products.
        </p>
        {unreadCount > 0 && (
          <p className="mt-3 inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            {unreadCount} new material request{unreadCount === 1 ? '' : 's'}
          </p>
        )}
        {quotePageUrl && (
          <p className="mt-4">
            <a
              href={quotePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Open public quote page
              <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </p>
        )}
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {supplierToolCards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex h-full flex-col rounded-2xl border border-indigo-100/90 bg-indigo-50/40 p-6 shadow-sm transition hover:border-indigo-200/90 hover:bg-indigo-50/70 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
                {c.href === '/dashboard/supplier/contractor-quotes' && unreadCount > 0 && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-600">{c.description}</p>
              <span className="mt-4 text-sm font-semibold text-indigo-600">Open →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
