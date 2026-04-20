'use client';

import { MaterialQuoteRequestViewer } from '@/components/dashboard/MaterialQuoteRequestViewer';
import {
  materialLinesToTsv,
  normalizeMaterialListClipboardPaste,
  parseMaterialListFromPaste,
} from '@/lib/material-quote-lines';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ClipboardEvent } from 'react';

export function ContractorQuoteDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [request, setRequest] = useState<MaterialQuoteRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftResponse, setDraftResponse] = useState('');
  const [draftMaterialTsv, setDraftMaterialTsv] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      const j = (await r.json()) as { error?: string; request?: MaterialQuoteRequestDto };
      if (!r.ok) {
        setLoadError(j.error || 'Could not load this request.');
        setRequest(null);
        return;
      }
      if (!j.request) {
        setLoadError('Request not found.');
        setRequest(null);
        return;
      }
      setRequest(j.request);
      setDraftResponse(j.request.supplier_response || '');
      setDraftMaterialTsv(materialLinesToTsv(j.request.supplier_material_list || []));
      await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}/seen`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      setLoadError('Network error.');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const onMaterialTsvPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const chunk = normalizeMaterialListClipboardPaste(e.clipboardData);
    if (chunk == null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setDraftMaterialTsv((prev) => {
      const next = prev.slice(0, start) + chunk + prev.slice(end);
      queueMicrotask(() => {
        el.selectionStart = el.selectionEnd = start + chunk.length;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveResponse() {
    if (!request) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(request.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_response: draftResponse,
          status: 'quoted',
          supplier_material_list_json: (() => {
            const rows = parseMaterialListFromPaste(draftMaterialTsv);
            return rows.length ? rows : null;
          })(),
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error || 'Save failed');
      }
      setEditing(false);
      await load();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-slate-600">
        Invalid link.{' '}
        <Link href="/dashboard/supplier/contractor-quotes" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Back to contractor quotes
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (loadError || !request) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <p className="text-sm font-medium text-red-600">{loadError || 'Not found.'}</p>
        <Link href="/dashboard/supplier/contractor-quotes" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          ← Back to contractor quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/supplier/contractor-quotes"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Contractor quotes
        </Link>
        <span className="text-slate-300">/</span>
        <span className="truncate text-sm font-medium text-slate-500">{request.contractor.company_name}</span>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Material request</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {request.project?.design_summary || 'Material request'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              From <span className="font-medium text-slate-700">{request.contractor.company_name}</span>
              {' · '}
              Sent {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
          {editing ? (
            <div className="w-full min-w-[240px] max-w-lg space-y-2">
              <Link
                href={`/dashboard/supplier/embedded-calculator?materialRequest=${encodeURIComponent(request.id)}`}
                className="inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                Sheet calculator + quote
              </Link>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Final material list (paste from Sheets — tab-separated rows)
              </label>
              <textarea
                value={draftMaterialTsv}
                onChange={(e) => setDraftMaterialTsv(e.target.value)}
                onPaste={onMaterialTsvPaste}
                rows={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                placeholder={'Example:\nPost 6x6 x8\t12\tEA\t24.00\t288.00\nRails 2x3 x16\t8\tEA'}
                spellCheck={false}
              />
              <textarea
                value={draftResponse}
                onChange={(e) => setDraftResponse(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Material quote, SKUs, lead time, or questions…"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveResponse()}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save & mark quoted'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setDraftResponse(request.supplier_response || '');
                    setDraftMaterialTsv(materialLinesToTsv(request.supplier_material_list || []));
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/supplier/embedded-calculator?materialRequest=${encodeURIComponent(request.id)}`}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                Sheet calculator + quote
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setDraftResponse(request.supplier_response || '');
                  setDraftMaterialTsv(materialLinesToTsv(request.supplier_material_list || []));
                }}
                className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                {request.supplier_response ? 'Edit response' : 'Respond'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <MaterialQuoteRequestViewer request={request} />
        </div>

        {request.supplier_response && !editing ? (
          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-medium">Your notes: </span>
            {request.supplier_response}
          </div>
        ) : null}
      </div>
    </div>
  );
}
