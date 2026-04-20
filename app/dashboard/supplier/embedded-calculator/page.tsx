import { Suspense } from 'react';
import { EmbeddedCalculatorScrollLock } from '@/components/dashboard/EmbeddedCalculatorScrollLock';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';
import { SupplierEmbeddedCalculatorClient } from '@/components/dashboard/SupplierEmbeddedCalculatorClient';

export default async function SupplierEmbeddedCalculatorPage() {
  await requireSupplierDashboard();

  return (
    <EmbeddedCalculatorScrollLock>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500">Loading calculator…</div>
        }
      >
        <SupplierEmbeddedCalculatorClient />
      </Suspense>
    </EmbeddedCalculatorScrollLock>
  );
}
