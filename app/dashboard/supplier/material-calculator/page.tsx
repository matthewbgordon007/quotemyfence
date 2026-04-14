import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function ensureSupplierAccess() {
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
  if (!userRow?.contractor_id) redirect('/dashboard');
  const { data: contractor } = await supabase
    .from('contractors')
    .select('account_type')
    .eq('id', userRow.contractor_id)
    .maybeSingle();
  if (contractor?.account_type !== 'supplier') redirect('/dashboard');
}

export default async function SupplierMaterialCalculatorPage() {
  await ensureSupplierAccess();

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Supplier Pages</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Material Calculator</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Blank slate page for supplier-specific material calculation workflows. Next we can layer in SKUs, bundles,
          and contractor quote-to-material conversion.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
