import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

type DashboardHomeCard = {
  href?: string;
  title: string;
  description: string;
  /** Matches sidebar: contractor materials nav is disabled for now */
  disabled?: boolean;
};

const contractorWorkspaceCards: DashboardHomeCard[] = [
  {
    href: '/dashboard',
    title: 'Overview',
    description: 'Pipeline, KPIs, and workspace shortcuts — same as contractor accounts.',
  },
  {
    href: '/dashboard/customers',
    title: 'Leads',
    description: 'Customers, quote requests, and follow-ups.',
  },
  {
    href: '/dashboard/calculator',
    title: 'Quote',
    description: 'Build line-item quotes and ranges.',
  },
  {
    href: '/dashboard/quote-template',
    title: 'Template',
    description: 'Branding and default copy for customer-facing quotes.',
  },
  {
    href: '/dashboard/layout',
    title: 'Draw',
    description: 'Layout and drawing tools tied to quotes.',
  },
  {
    disabled: true,
    title: 'Materials',
    description: 'Contractor materials calculator — enabled in the sidebar when it ships.',
  },
  {
    href: '/dashboard/products',
    title: 'Products',
    description: 'Catalog, pricing, and what appears on quotes.',
  },
];

const supplierToolCards: DashboardHomeCard[] = [
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
    href: '/dashboard/supplier/material-calculator',
    title: 'Material calculator',
    description: 'SKUs, bundles, and quote-to-material workflows for suppliers.',
  },
];

function CardGrid({ cards, accent }: { cards: DashboardHomeCard[]; accent: 'slate' | 'indigo' }) {
  const isIndigo = accent === 'indigo';
  const borderHover = isIndigo ? 'hover:border-indigo-200/80' : 'hover:border-slate-300/90';
  const ctaClass = isIndigo ? 'text-indigo-600' : 'text-blue-600';

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const key = c.href ?? c.title;
        const disabled = Boolean(c.disabled);

        if (disabled || !c.href) {
          return (
            <li key={key}>
              <div className="flex h-full flex-col rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 p-6">
                <h2 className="text-lg font-semibold text-slate-700">{c.title}</h2>
                <p className="mt-2 flex-1 text-sm text-slate-500">{c.description}</p>
                <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Coming soon</span>
              </div>
            </li>
          );
        }

        return (
          <li key={key}>
            <Link
              href={c.href}
              className={`flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition ${borderHover} hover:shadow-md`}
            >
              <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-600">{c.description}</p>
              <span className={`mt-4 text-sm font-semibold ${ctaClass}`}>Open →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

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

  const quotePageUrl = contractor?.slug ? `/estimate/${contractor.slug}/contact` : null;

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="border-b border-slate-200/80 pb-8">
        <p className="text-sm font-medium text-slate-500">Supplier account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {contractor?.company_name ? (
            <>
              <span className="text-slate-600">Welcome — </span>
              {contractor.company_name}
            </>
          ) : (
            'Supplier workspace'
          )}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Your account includes the full contractor dashboard (leads, quotes, products) plus supplier-only tools
          below. The sidebar labels match: <span className="font-medium text-slate-800">Contractor workspace</span>{' '}
          and <span className="font-medium text-indigo-800">Supplier workspace</span>.
        </p>
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

      <section className="mt-10">
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Contractor workspace</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Same pages contractors use. Jump in here for leads, quotes, and catalog — or use the first block in the
            sidebar.
          </p>
          <div className="mt-6">
            <CardGrid cards={contractorWorkspaceCards} accent="slate" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-700">Supplier workspace</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Tools for working with contractors and materials. These also appear in the indigo section of the sidebar.
          </p>
          <div className="mt-6">
            <CardGrid cards={supplierToolCards} accent="indigo" />
          </div>
        </div>
      </section>
    </div>
  );
}
