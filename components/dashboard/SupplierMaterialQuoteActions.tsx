'use client';

import type { MaterialQuoteLine } from '@/lib/material-quote-lines';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

const btnPrimary =
  'rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50';
const btnSecondary =
  'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

export function SupplierMaterialQuoteActions({
  requestId,
  onDownloadMasterPdf,
  masterPdfAvailable = true,
  buildMaterialRowsForQuote,
  quoteDetailHref,
  calculatorBlocked = false,
}: {
  requestId: string;
  onDownloadMasterPdf?: () => void | Promise<void>;
  masterPdfAvailable?: boolean;
  buildMaterialRowsForQuote?: () => MaterialQuoteLine[];
  quoteDetailHref?: string;
  calculatorBlocked?: boolean;
}) {
  const router = useRouter();
  const [saveBusy, setSaveBusy] = useState(false);

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

  if (!onDownloadMasterPdf && !buildMaterialRowsForQuote) return null;

  return (
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
          Download a PDF from the calculator, or save this takeoff to the contractor quote and return to send materials or
          mark quoted.
        </p>
      )}
      {onDownloadMasterPdf ? (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={!masterPdfAvailable}
            onClick={() => void onDownloadMasterPdf()}
            className={`${btnSecondary} w-full max-w-xl`}
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
            className={`${btnPrimary} w-full max-w-xl`}
          >
            {saveBusy ? 'Saving…' : 'Save to contractor quote & return'}
          </button>
          <p className="text-xs text-slate-500">
            Saves line items from the <span className="font-medium text-slate-700">active tab</span> to this request, then
            opens the quote where you can send the list or mark quoted.
          </p>
        </div>
      ) : null}
    </div>
  );
}
