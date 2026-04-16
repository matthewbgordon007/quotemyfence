import Link from 'next/link';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';
import { SupplierEmbeddedCalculatorClient } from '@/components/dashboard/SupplierEmbeddedCalculatorClient';

export default async function SupplierEmbeddedCalculatorPage() {
  await requireSupplierDashboard();

  return (
    <>
      <SupplierEmbeddedCalculatorClient />
      <div className="mx-auto mt-4 max-w-6xl pb-8">
        <Link
          href="/dashboard/supplier"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back to supplier home
        </Link>
      </div>
    </>
  );
}
