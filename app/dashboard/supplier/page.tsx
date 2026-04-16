import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

const cards = [
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
    description: 'SKUs, bundles, and quote-to-material workflows.',
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
    ? await supabase
        .from('contractors')
        .select('company_name')
        .eq('id', userRow.contractor_id)
        .single()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="border-b border-slate-200/80 pb-8">
        <p className="text-sm font-medium text-slate-500">Supplier workspace</p>
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
          Use the tools below to work with contractors and materials. Account settings and billing stay under Business
          in the sidebar when you have access.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-blue-200/80 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-600">{c.description}</p>
              <span className="mt-4 text-sm font-semibold text-blue-600">Open →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
