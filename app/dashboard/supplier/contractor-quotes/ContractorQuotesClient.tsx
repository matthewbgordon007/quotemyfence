'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';
import dynamic from 'next/dynamic';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  { ssr: false, loading: () => <div className="min-h-[300px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" /> }
);

type MaterialReq = {
  id: string;
  description: string;
  status: string;
  supplier_response: string | null;
  master_response: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  supplier_seen_at?: string | null;
  contractor: { company_name: string; slug: string | null; email?: string | null; phone?: string | null };
  project?: {
    total_length_ft?: number | null;
    design_summary?: string | null;
    design_option?: { height_ft?: number; type?: string; style?: string; colour?: string } | null;
    has_removal?: boolean | null;
    quote_totals?: { total_low: number; total_high: number } | null;
    segments?: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[];
    gates?: { gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[];
    image_data_url?: string | null;
    drawing_data?: {
      points: { x: number; y: number }[];
      segments: { length_ft: number }[];
      gates: { type: 'single' | 'double'; quantity: number }[];
      total_length_ft: number;
    } | null;
  };
};

export function ContractorQuotesClient() {
  const [requests, setRequests] = useState<MaterialReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [draftResponse, setDraftResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const unreadCount = requests.filter((r) => !r.supplier_seen_at).length;

  const load = useCallback(async () => {
    const rq = await fetch('/api/supplier/material-quote-requests', { credentials: 'include' });
    const rj = await rq.json();
    if (rq.ok) setRequests(rj.requests || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
        await fetch('/api/supplier/material-quote-notifications/mark-seen', {
          method: 'POST',
          credentials: 'include',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (requests.length === 0) {
      setSelectedRequestId(null);
      return;
    }
    if (!selectedRequestId || !requests.some((r) => r.id === selectedRequestId)) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  async function saveResponse(id: string) {
    setSaving(true);
    try {
      const r = await fetch(`/api/supplier/material-quote-requests/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_response: draftResponse,
          status: 'quoted',
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Save failed');
      }
      setEditingId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) || null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Supplier workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Contractor quotes</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Material layout requests from contractors appear here. Respond with quote details and mark as quoted.
        </p>
        {unreadCount > 0 && (
          <p className="mt-3 inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            {unreadCount} new material request{unreadCount === 1 ? '' : 's'}
          </p>
        )}
        <Link href="/dashboard/supplier" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-500">
          ← Supplier home
        </Link>
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Material layout requests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Contractors send fence layouts from a lead or the Draw page. Open a request to review the drawing, footage,
          and selected fence details before responding.
        </p>
        {requests.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">No requests assigned to you yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3">
              {requests.map((req) => {
                const isSelected = req.id === selectedRequestId;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`w-full rounded-xl border p-4 text-left shadow-sm transition ${
                      isSelected
                        ? 'border-indigo-300 bg-white ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-slate-500">{req.contractor.company_name}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {req.project?.design_summary || 'Material request'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(req.created_at).toLocaleString()}</p>
                      </div>
                      {!req.supplier_seen_at ? (
                        <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-600">Status: {req.status}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {Math.round(Number(req.project?.total_length_ft || 0))} ft
                      {req.project?.has_removal ? ' • Removal included' : ''}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedRequest && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Material request from {selectedRequest.contractor.company_name}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      {selectedRequest.project?.design_summary || 'Material request'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Sent {new Date(selectedRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                  {editingId === selectedRequest.id ? (
                    <div className="w-full min-w-[240px] max-w-md space-y-2">
                      <textarea
                        value={draftResponse}
                        onChange={(e) => setDraftResponse(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Material quote, SKUs, lead time, or questions…"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveResponse(selectedRequest.id)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save & mark quoted'}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(selectedRequest.id);
                        setDraftResponse(selectedRequest.supplier_response || '');
                      }}
                      className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      {selectedRequest.supplier_response ? 'Edit response' : 'Respond'}
                    </button>
                  )}
                </div>

                {(selectedRequest.contractor.email || selectedRequest.contractor.phone) && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contractor details</p>
                    {selectedRequest.contractor.email && <p className="mt-2">Email: {selectedRequest.contractor.email}</p>}
                    {selectedRequest.contractor.phone && <p className="mt-1">Phone: {selectedRequest.contractor.phone}</p>}
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fence information</p>
                    <p className="mt-2 text-sm text-slate-800">
                      Material selection: {selectedRequest.project?.design_summary || 'Not selected'}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      Total footage: {Math.round(Number(selectedRequest.project?.total_length_ft || 0))} ft
                    </p>
                    {selectedRequest.project?.has_removal ? (
                      <p className="mt-1 text-sm text-slate-600">Removal included</p>
                    ) : null}
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Status: <span className="text-slate-800">{selectedRequest.status}</span>
                    </p>
                  </div>
                  {selectedRequest.attachment_url && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attachment</p>
                      <a
                        href={selectedRequest.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-semibold text-indigo-700 hover:underline"
                      >
                        {selectedRequest.attachment_name || 'Open file'}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request notes</p>
                  <p className="mt-2 text-sm text-slate-800">{selectedRequest.description}</p>
                </div>

                {((selectedRequest.project?.segments?.length ?? 0) > 0 || selectedRequest.project?.drawing_data) && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fence drawing</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRequest.project?.image_data_url ? 'Layout drawing (from Draw).' : 'The outline they drew on the map.'}
                    </p>
                    {selectedRequest.project?.image_data_url ? (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <img
                          src={selectedRequest.project.image_data_url}
                          alt="Customer layout"
                          className="max-h-[420px] w-full object-contain"
                        />
                      </div>
                    ) : null}
                    {(selectedRequest.project?.segments?.length ?? 0) > 0 ? (
                      <div className="mt-2">
                        <p className="mb-2 text-sm font-medium text-slate-600">
                          {selectedRequest.project?.image_data_url ? 'Map view' : 'Fence outline'}
                        </p>
                        <FenceDrawingMap
                          segments={selectedRequest.project?.segments || []}
                          gates={selectedRequest.project?.gates || []}
                          className="min-h-[300px]"
                        />
                      </div>
                    ) : selectedRequest.project?.drawing_data ? (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <LayoutDrawCanvas initialDrawing={selectedRequest.project.drawing_data} readOnly />
                      </div>
                    ) : null}
                    {((selectedRequest.project?.segments?.length ?? 0) > 0 || selectedRequest.project?.total_length_ft) && (
                      <div className="mt-4 space-y-2">
                        {(selectedRequest.project?.segments?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                            <span className="font-medium">Segment lengths:</span>
                            {(selectedRequest.project?.segments || []).map((seg, i) => (
                              <span key={i} className="text-slate-600">
                                Line {i + 1}: {seg.length_ft != null ? `${Number(seg.length_ft).toFixed(1)} ft` : '—'}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span><strong>Total length:</strong> {Number(selectedRequest.project?.total_length_ft || 0).toFixed(1)} ft</span>
                          {selectedRequest.project?.has_removal && <span className="text-slate-600">Removal included</span>}
                          {(selectedRequest.project?.gates?.length ?? 0) > 0 && (
                            <span>
                              <strong>Gates:</strong> {(selectedRequest.project?.gates || []).map((g) => `${g.quantity} ${g.gate_type}`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Design choice</p>
                  {selectedRequest.project?.design_summary ? (
                    <>
                      <p className="mt-2 font-medium text-slate-900">{selectedRequest.project.design_summary}</p>
                      {selectedRequest.project.design_option && (
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          {selectedRequest.project.design_option.height_ft != null && (
                            <><dt className="text-slate-500">Height</dt><dd>{selectedRequest.project.design_option.height_ft} ft</dd></>
                          )}
                          {selectedRequest.project.design_option.type && (
                            <><dt className="text-slate-500">Material / type</dt><dd>{selectedRequest.project.design_option.type}</dd></>
                          )}
                          {selectedRequest.project.design_option.style && (
                            <><dt className="text-slate-500">Style</dt><dd>{selectedRequest.project.design_option.style}</dd></>
                          )}
                          {selectedRequest.project.design_option.colour && (
                            <><dt className="text-slate-500">Colour</dt><dd>{selectedRequest.project.design_option.colour}</dd></>
                          )}
                        </dl>
                      )}
                      {selectedRequest.project.quote_totals && (
                        <div className="mt-4 rounded-xl bg-white p-4">
                          <p className="text-sm font-semibold text-slate-500">Estimated range</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            ${Number(selectedRequest.project.quote_totals.total_low).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${Number(selectedRequest.project.quote_totals.total_high).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">No design selection saved.</p>
                  )}
                  </div>

                {selectedRequest.supplier_response && editingId !== selectedRequest.id && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-medium">Your notes: </span>
                    {selectedRequest.supplier_response}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
