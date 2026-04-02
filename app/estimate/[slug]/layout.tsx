import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getContractorPublicConfig } from '@/lib/contractor';
import { EstimateProvider } from './EstimateContext';
import { EstimateSessionHydration } from './EstimateSessionHydration';
import { EstimateStepIndicator } from './EstimateStepIndicator';

export default async function EstimateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = await getContractorPublicConfig(slug);
  if (!config) notFound();

  const { contractor } = config;
  const primary = contractor.primary_color || '#2563eb';
  const secondary = contractor.secondary_color || '#0ea5e9';

  return (
    <EstimateProvider config={config}>
      <Suspense fallback={null}>
        <EstimateSessionHydration slug={slug} />
      </Suspense>
      <div
        className="min-h-screen bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60"
        style={
          {
            '--accent': primary,
            '--accent-secondary': secondary,
          } as React.CSSProperties
        }
      >
        <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/95 backdrop-blur-md shadow-sm">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {contractor.logo_url ? (
                <img
                  src={contractor.logo_url}
                  alt={contractor.company_name}
                  className="h-11 w-auto rounded-lg border border-[var(--line)] object-contain"
                />
              ) : (
                <div
                  className="h-11 w-11 rounded-lg shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  }}
                />
              )}
              <span className="font-bold text-lg tracking-tight">
                {contractor.company_name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <EstimateStepIndicator />
              <a
                href="/"
                className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]"
              >
                QuoteMyFence
              </a>
            </div>
          </div>
        </header>
        {children}
      </div>
    </EstimateProvider>
  );
}
