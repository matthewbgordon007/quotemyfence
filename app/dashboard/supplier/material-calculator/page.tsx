import Link from 'next/link';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

export default async function SupplierMaterialCalculatorPage() {
  await requireSupplierDashboard();

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
            href="/dashboard/supplier"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to supplier home
          </Link>
        </div>
      </div>
    </div>
  );
}
