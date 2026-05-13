'use client';

import { MaterialQuoteRequestViewer } from '@/components/dashboard/MaterialQuoteRequestViewer';
import {
  materialLinesToTsv,
  normalizeMaterialListClipboardPaste,
  parseMaterialListFromPaste,
} from '@/lib/material-quote-lines';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ClipboardEvent } from 'react';

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

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
  const [materialDraftTsv, setMaterialDraftTsv] = useState('');
  const [materialSaving, setMaterialSaving] = useState(false);
  const [quotedNotesDraft, setQuotedNotesDraft] = useState('');
  const [quotedSaving, setQuotedSaving] = useState(false);

  useEffect(() => {
    const id = requestId.trim();
    if (!id) {
      setSideRequest(null);
      setSideError(null);
      setSideLoading(false);
      setMaterialDraftTsv('');
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
          setMaterialDraftTsv(materialLinesToTsv(j.request.supplier_material_list || []));
          setQuotedNotesDraft(j.request.supplier_response?.trim() ? j.request.supplier_response : '');
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

  const refetchMaterialRequest = useCallback(async () => {
    const id = requestId.trim();
    if (!id) return;
    const refetch = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
      credentials: 'include',
    });
    const jj = (await refetch.json()) as { request?: MaterialQuoteRequestDto };
    if (jj.request) {
      setSideRequest(jj.request);
      setMaterialDraftTsv(materialLinesToTsv(jj.request.supplier_material_list || []));
      setQuotedNotesDraft(jj.request.supplier_response?.trim() ? jj.request.supplier_response : '');
    }
  }, [requestId]);

  const onMaterialTsvPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const chunk = normalizeMaterialListClipboardPaste(e.clipboardData);
    if (chunk == null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setMaterialDraftTsv((prev) => {
      const next = prev.slice(0, start) + chunk + prev.slice(end);
      queueMicrotask(() => {
        el.selectionStart = el.selectionEnd = start + chunk.length;
      });
      return next;
    });
  }, []);

  const materialParsedCount = useMemo(
    () => parseMaterialListFromPaste(materialDraftTsv).length,
    [materialDraftTsv],
  );

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

      <section className="overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-50/50 to-white shadow-sm">
        <div className="border-b border-amber-100/90 px-5 py-4 sm:px-6">
          <p className={sectionLabel}>Reply to contractor</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Material list &amp; quote</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Paste tab-separated rows from Excel or Google Sheets (Description, Qty, Unit, …). Save materials only, or mark
            quoted when you are ready to notify the contractor.
          </p>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="material-tsv-draft-mc">
                1 — Material lines
              </label>
              <span className="text-xs tabular-nums text-slate-500">
                {materialParsedCount === 0
                  ? 'No rows yet'
                  : `${materialParsedCount} line${materialParsedCount === 1 ? '' : 's'} parsed`}
              </span>
            </div>
            <textarea
              id="material-tsv-draft-mc"
              value={materialDraftTsv}
              onChange={(e) => setMaterialDraftTsv(e.target.value)}
              onPaste={onMaterialTsvPaste}
              rows={12}
              className={`min-h-[11rem] ${field} font-mono text-xs leading-relaxed`}
              placeholder="Description&#9;Qty&#9;Unit&#9;Unit $&#9;Line $"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="supplier-quote-notes-mc">
              2 — Supplier notes{' '}
              <span className="font-normal text-slate-500">(optional; included when marked quoted)</span>
            </label>
            <textarea
              id="supplier-quote-notes-mc"
              value={quotedNotesDraft}
              onChange={(e) => setQuotedNotesDraft(e.target.value)}
              rows={6}
              className={`min-h-[7rem] ${field}`}
              placeholder="SKUs, lead time, pickup instructions…"
            />
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <p className={sectionLabel}>3 — Send to contractor</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <button
                type="button"
                disabled={materialSaving || quotedSaving}
                onClick={async () => {
                  const id = requestId.trim();
                  if (!id) return;
                  setMaterialSaving(true);
                  try {
                    const rows = parseMaterialListFromPaste(materialDraftTsv);
                    const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        supplier_material_list_json: rows.length ? rows : null,
                      }),
                    });
                    const j = (await r.json()) as { error?: string };
                    if (!r.ok) throw new Error(j.error || 'Save failed');
                    await refetchMaterialRequest();
                    alert('Saved to contractor quote.');
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Save failed');
                  } finally {
                    setMaterialSaving(false);
                  }
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {materialSaving ? 'Saving…' : 'Save to contractor quote'}
              </button>
              <span className="text-xs text-slate-500">Updates the material list only; request stays open.</span>
            </div>
            <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <button
                type="button"
                disabled={materialSaving || quotedSaving}
                onClick={async () => {
                  const id = requestId.trim();
                  if (!id) return;
                  if (!confirm('Mark this request as quoted and email the contractor?')) return;
                  setQuotedSaving(true);
                  try {
                    const rows = parseMaterialListFromPaste(materialDraftTsv);
                    const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        supplier_material_list_json: rows.length ? rows : null,
                        supplier_response: quotedNotesDraft.trim() || null,
                        status: 'quoted',
                      }),
                    });
                    const j = (await r.json()) as { error?: string };
                    if (!r.ok) throw new Error(j.error || 'Save failed');
                    await refetchMaterialRequest();
                    alert('Marked quoted. The contractor receives an email when mail is configured.');
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Save failed');
                  } finally {
                    setQuotedSaving(false);
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {quotedSaving ? 'Saving…' : 'Save & mark quoted'}
              </button>
              <span className="text-xs text-slate-500">Saves notes and materials and notifies the contractor.</span>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Contractor installed quote</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              They open <span className="font-medium">Quote calculator</span> with your link to build the installed quote
              and save to a customer or new lead. The material list appears there when opened from this request.
            </p>
            <div className="mt-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                onClick={() => {
                  const id = requestId.trim();
                  const path = `/dashboard/calculator?material_quote_id=${encodeURIComponent(id)}`;
                  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
                  void navigator.clipboard.writeText(url).then(
                    () => alert('Calculator link copied. Send it to your contractor.'),
                    () => prompt('Copy this link:', url),
                  );
                }}
              >
                Copy contractor calculator link
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
