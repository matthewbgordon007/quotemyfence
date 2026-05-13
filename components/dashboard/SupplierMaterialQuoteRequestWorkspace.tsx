'use client';

import { MaterialQuoteRequestViewer } from '@/components/dashboard/MaterialQuoteRequestViewer';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

export function SupplierMaterialQuoteRequestWorkspace({
  requestId,
  calculatorBasePath,
}: {
  requestId: string;
  calculatorBasePath: string;
}) {
  const [sideRequest, setSideRequest] = useState<MaterialQuoteRequestDto | null>(null);
  const [sideLoading, setSideLoading] = useState(false);
  const [sideError, setSideError] = useState<string | null>(null);

  useEffect(() => {
    const id = requestId.trim();
    if (!id) {
      setSideRequest(null);
      setSideError(null);
      setSideLoading(false);
      return;
    }
    let cancelled = false;
    setSideLoading(true);
    setSideError(null);
    setSideRequest(null);
    (async () => {
      try {
        const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        const j = (await r.json()) as { error?: string; request?: MaterialQuoteRequestDto };
        if (cancelled) return;
        if (!r.ok) {
          setSideError(j.error || 'Could not load this material request.');
          setSideRequest(null);
        } else if (j.request) {
          setSideRequest(j.request);
          setSideError(null);
        } else {
          setSideError('Request not found.');
          setSideRequest(null);
        }
      } catch {
        if (!cancelled) {
          setSideError('Network error loading the request.');
          setSideRequest(null);
        }
      } finally {
        if (!cancelled) setSideLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return (
    <div className="flex w-full shrink-0 flex-col gap-6 xl:sticky xl:top-4 xl:max-h-[min(88dvh,56rem)] xl:w-[min(24rem,100%)] xl:overflow-y-auto xl:overscroll-contain">
      <aside
        className="space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 shadow-sm sm:p-5"
        style={{ borderColor: 'var(--dashboard-line)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="min-w-0">
            <p className={sectionLabel}>Contractor request</p>
            {sideRequest ? (
              <>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{sideRequest.contractor.company_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{new Date(sideRequest.created_at).toLocaleString()}</p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-700">
                  {sideRequest.project.design_summary || 'Material request'}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Loading request…</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 text-right">
            <Link
              href={calculatorBasePath}
              scroll={false}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Hide panel
            </Link>
            <Link href="/dashboard/supplier/contractor-quotes" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
              All requests
            </Link>
          </div>
        </div>
        {sideLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : sideError ? (
          <p className="text-sm font-medium text-red-600">{sideError}</p>
        ) : sideRequest ? (
          <MaterialQuoteRequestViewer request={sideRequest} compact />
        ) : null}
      </aside>
    </div>
  );
}
