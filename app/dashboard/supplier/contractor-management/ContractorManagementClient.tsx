'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type LinkedRow = {
  link_id: string;
  linked_at: string;
  contractor: { id: string; company_name: string; slug: string | null; logo_url?: string | null };
};

export function ContractorManagementClient() {
  const [linked, setLinked] = useState<LinkedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const lr = await fetch('/api/supplier/linked-contractors', { credentials: 'include' });
    const lj = await lr.json();
    if (lr.ok) setLinked(lj.contractors || []);
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

  async function removeLink(linkId: string) {
    if (!confirm('Remove this contractor from your supplier list?')) return;
    setRemovingLinkId(linkId);
    try {
      const r = await fetch(`/api/supplier/linked-contractors/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Failed');
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRemovingLinkId(null);
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
          Contractors who linked your company appear here. Use Contractor Quotes for material layout requests and quote
          responses.
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
                <button
                  type="button"
                  disabled={removingLinkId === row.link_id}
                  onClick={() => void removeLink(row.link_id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {removingLinkId === row.link_id ? 'Removing…' : 'Remove contractor'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
