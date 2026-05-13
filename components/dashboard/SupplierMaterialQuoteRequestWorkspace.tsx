'use client';

import { MaterialQuoteRequestViewer } from '@/components/dashboard/MaterialQuoteRequestViewer';
import type { MaterialQuoteLine } from '@/lib/material-quote-lines';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

const btnPrimary =
  'rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50';
const btnSecondary =
  'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

export function SupplierMaterialQuoteRequestWorkspace({
  requestId,
  calculatorBasePath,
  onDownloadMasterPdf,
  masterPdfAvailable = true,
  buildMaterialRowsForQuote,
  quoteDetailHref,
  calculatorBlocked = false,
}: {
  requestId: string;
  calculatorBasePath: string;
  onDownloadMasterPdf?: () => void | Promise<void>;
  /** When false, PDF button disabled with hint (e.g. not on PVC tab). */
  masterPdfAvailable?: boolean;
  buildMaterialRowsForQuote?: () => MaterialQuoteLine[];
  quoteDetailHref?: string;
  /** Quote material is not PVC / chain / hybrid — hide save/PDF actions. */
  calculatorBlocked?: boolean;
}) {
  const router = useRouter();
  const [sideRequest, setSideRequest] = useState<MaterialQuoteRequestDto | null>(null);
  const [sideLoading, setSideLoading] = useState(false);
  const [sideError, setSideError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

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

  const detailHref =
    quoteDetailHref?.trim() ||
    (requestId.trim() ? `/dashboard/supplier/contractor-quotes/${encodeURIComponent(requestId.trim())}` : '');

  async function saveCalculatorToQuoteAndReturn() {
    const id = requestId.trim();
    if (!id || !buildMaterialRowsForQuote || !detailHref) return;
    const rows = buildMaterialRowsForQuote();
    if (!rows.length) {
      alert(
        'Nothing to save yet — add fence takeoff on the active tab (PVC, Chain link, or Hybrid) so quantities appear, then try again.'
      );
      return;
    }
    setSaveBusy(true);
    try {
      const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_material_list_json: rows,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Save failed');
      router.push(detailHref);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveBusy(false);
    }
  }

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

      {(onDownloadMasterPdf || buildMaterialRowsForQuote) && (
        <div
          className={`space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5 ${calculatorBlocked ? 'pointer-events-none opacity-50' : ''}`}
        >
          <p className={sectionLabel}>Quote actions</p>
          {calculatorBlocked ? (
            <p className="text-sm text-amber-900">
              Calculator actions are hidden because this job&apos;s material type is not supported in the FMS hub yet.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Download a PDF from the calculator, or save this takeoff to the contractor quote and return to send materials
              or mark quoted.
            </p>
          )}
          {onDownloadMasterPdf ? (
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={!masterPdfAvailable}
                onClick={() => void onDownloadMasterPdf()}
                className={`${btnSecondary} w-full`}
              >
                Download master material list (PDF)
              </button>
              {!masterPdfAvailable ? (
                <p className="text-xs text-amber-800/90">Switch to the PVC tab to generate this Master-style PDF.</p>
              ) : (
                <p className="text-xs text-slate-500">Uses current PVC breakdown + Master rows from the main calculator.</p>
              )}
            </div>
          ) : null}
          {buildMaterialRowsForQuote && detailHref ? (
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void saveCalculatorToQuoteAndReturn()}
                className={`${btnPrimary} w-full`}
              >
                {saveBusy ? 'Saving…' : 'Save to contractor quote & return'}
              </button>
              <p className="text-xs text-slate-500">
                Saves line items from the <span className="font-medium text-slate-700">active tab</span> to this request,
                then opens the quote where you can send the list or mark quoted.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
