'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';

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
    has_removal?: boolean | null;
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
          Contractors send fence layouts from a lead or the Draw page. Add your quote notes and mark as quoted when done.
        </p>
        {requests.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">No requests assigned to you yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {requests.map((req) => (
              <li key={req.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">{req.contractor.company_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(req.created_at).toLocaleString()}</p>
                    {(req.contractor.email || req.contractor.phone) && (
                      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                        {req.contractor.email && <p>Contractor email: {req.contractor.email}</p>}
                        {req.contractor.phone && <p>Contractor phone: {req.contractor.phone}</p>}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-slate-800">{req.description}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project details</p>
                        <p className="mt-2 text-sm text-slate-800">
                          Material selection: {req.project?.design_summary || 'Not selected'}
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          Total footage: {Math.round(Number(req.project?.total_length_ft || 0))} ft
                        </p>
                        {req.project?.has_removal ? (
                          <p className="mt-1 text-sm text-slate-600">Removal included</p>
                        ) : null}
                      </div>
                      {req.project?.drawing_data ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Customer drawing</p>
                          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <LayoutDrawCanvas initialDrawing={req.project.drawing_data} readOnly />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {req.attachment_url && (
                      <p className="mt-2 text-xs">
                        <a
                          href={req.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-indigo-700 hover:underline"
                        >
                          Attachment: {req.attachment_name || 'Open file'}
                        </a>
                      </p>
                    )}
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Status: <span className="text-slate-800">{req.status}</span>
                    </p>
                    {req.supplier_response && editingId !== req.id && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                        <span className="font-medium">Your notes: </span>
                        {req.supplier_response}
                      </p>
                    )}
                  </div>
                  {editingId === req.id ? (
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
                          onClick={() => void saveResponse(req.id)}
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
                        setEditingId(req.id);
                        setDraftResponse(req.supplier_response || '');
                      }}
                      className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      {req.supplier_response ? 'Edit response' : 'Respond'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
