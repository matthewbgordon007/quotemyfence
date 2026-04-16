'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type LinkedRow = {
  link_id: string;
  linked_at: string;
  contractor: { id: string; company_name: string; slug: string | null; logo_url?: string | null };
};

type MaterialReq = {
  id: string;
  description: string;
  status: string;
  supplier_response: string | null;
  master_response: string | null;
  created_at: string;
  contractor: { company_name: string; slug: string | null };
};

export function ContractorManagementClient() {
  const [linked, setLinked] = useState<LinkedRow[]>([]);
  const [requests, setRequests] = useState<MaterialReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftResponse, setDraftResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [lr, rq] = await Promise.all([
      fetch('/api/supplier/linked-contractors', { credentials: 'include' }),
      fetch('/api/supplier/material-quote-requests', { credentials: 'include' }),
    ]);
    const lj = await lr.json();
    const rj = await rq.json();
    if (lr.ok) setLinked(lj.contractors || []);
    if (rq.ok) setRequests(rj.requests || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
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
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Supplier workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Contractor management</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Contractors who linked your company appear here. When they send a fence layout for a material quote, it
          appears in the requests list below.
        </p>
        <Link
          href="/dashboard/supplier"
          className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-500"
        >
          ← Supplier home
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Linked contractors</h2>
        <p className="mt-1 text-sm text-slate-600">
          These companies selected you as a supplier. They can browse your catalog (without your pricing) and import
          styles to their own catalog.
        </p>
        {linked.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No contractors have linked you yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {linked.map((row) => (
              <li key={row.link_id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div className="flex items-center gap-3">
                  {row.contractor.logo_url ? (
                    <img src={row.contractor.logo_url} alt="" className="h-9 w-9 rounded-md object-contain" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">
                      {row.contractor.company_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{row.contractor.company_name}</p>
                    <p className="text-xs text-slate-500">Linked {new Date(row.linked_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Material layout requests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Contractors send fence layouts from a lead or the Draw page. Add your quote notes and mark as quoted when
          done.
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
                    <p className="mt-2 text-sm text-slate-800">{req.description}</p>
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
