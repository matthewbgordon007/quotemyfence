'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type SupplierRow = { id: string; company_name: string; logo_url: string | null; slug: string };

type CatalogStyle = {
  id: string;
  fence_type_id: string;
  style_name: string;
  photo_url: string | null;
  already_imported?: boolean;
};

type CatalogType = { id: string; name: string };

type CatalogColour = { id: string; fence_style_id: string; color_name: string; photo_url: string | null };
type BuyerType = { id: string; name: string };

export default function SuppliersPage() {
  const [accountType, setAccountType] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [supplierMeta, setSupplierMeta] = useState<{ company_name: string } | null>(null);
  const [fenceTypes, setFenceTypes] = useState<CatalogType[]>([]);
  const [fenceStyles, setFenceStyles] = useState<CatalogStyle[]>([]);
  const [colours, setColours] = useState<CatalogColour[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [importingStyleId, setImportingStyleId] = useState<string | null>(null);
  const [buyerTypes, setBuyerTypes] = useState<BuyerType[]>([]);
  const [targetTypeId, setTargetTypeId] = useState<string>('');
  const [showImported, setShowImported] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStyleIds, setSelectedStyleIds] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const refreshDirectory = useCallback(async () => {
    const r = await fetch('/api/contractor/suppliers', { credentials: 'include' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to load');
    setSuppliers(d.suppliers || []);
    setLinkedIds(new Set(d.linkedSupplierIds || []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch('/api/contractor/me', { credentials: 'include' });
        const me = meRes.ok ? await meRes.json() : {};
        if (cancelled) return;
        setAccountType(me?.account_type ?? null);
        if (me?.account_type === 'supplier') {
          setLoading(false);
          return;
        }
        setIsAdmin(me?.user_role === 'owner' || me?.user_role === 'admin');
        const hierarchyRes = await fetch('/api/contractor/product-hierarchy', { credentials: 'include' });
        const hierarchy = hierarchyRes.ok ? await hierarchyRes.json() : {};
        if (!cancelled) {
          const types = (hierarchy?.fenceTypes || []) as BuyerType[];
          setBuyerTypes(types.map((t) => ({ id: t.id, name: t.name })));
        }
        await refreshDirectory();
      } catch {
        if (!cancelled) setSuppliers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshDirectory]);

  useEffect(() => {
    if (!selectedSupplierId || !linkedIds.has(selectedSupplierId)) {
      setFenceTypes([]);
      setFenceStyles([]);
      setColours([]);
      setSupplierMeta(null);
      setSelectedStyleIds(new Set());
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    fetch(`/api/contractor/suppliers/${selectedSupplierId}/catalog`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to load catalog');
        if (cancelled) return;
        setSupplierMeta(d.supplier || null);
        setFenceTypes(d.fenceTypes || []);
        setFenceStyles(d.fenceStyles || []);
        setColours(d.colourOptions || []);
        setSelectedStyleIds(new Set());
      })
      .catch((e) => {
        if (!cancelled) setCatalogError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSupplierId, linkedIds]);

  const linkedSuppliers = useMemo(
    () => suppliers.filter((s) => linkedIds.has(s.id)),
    [suppliers, linkedIds]
  );

  async function toggleLink(supplierId: string, linked: boolean) {
    setBusyId(supplierId);
    try {
      if (linked) {
        const r = await fetch(`/api/contractor/suppliers?supplier_contractor_id=${supplierId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Failed to unlink');
        }
      } else {
        const r = await fetch('/api/contractor/suppliers', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplier_contractor_id: supplierId }),
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Failed to link');
        }
      }
      await refreshDirectory();
      if (linked && selectedSupplierId === supplierId) setSelectedSupplierId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  async function importStyle(styleId: string) {
    if (!selectedSupplierId) return;
    setImportingStyleId(styleId);
    try {
      const r = await fetch(`/api/contractor/suppliers/${selectedSupplierId}/import-style`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_fence_style_id: styleId,
          target_type_id: targetTypeId || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Import failed');
      setStatus({ kind: 'success', text: d.message || 'Imported. Set pricing on Products.' });
      const cat = await fetch(`/api/contractor/suppliers/${selectedSupplierId}/catalog`, { credentials: 'include' });
      const cd = await cat.json();
      if (cat.ok) {
        setFenceStyles(cd.fenceStyles || []);
        setColours(cd.colourOptions || []);
        setSelectedStyleIds((prev) => {
          const next = new Set(prev);
          next.delete(styleId);
          return next;
        });
      }
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'Import failed' });
    } finally {
      setImportingStyleId(null);
    }
  }

  async function bulkImportSelected() {
    if (!selectedSupplierId || selectedStyleIds.size === 0) return;
    setBulkImporting(true);
    setStatus(null);
    const ids = Array.from(selectedStyleIds);
    let okCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        const r = await fetch(`/api/contractor/suppliers/${selectedSupplierId}/import-style`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_fence_style_id: id,
            target_type_id: targetTypeId || undefined,
          }),
        });
        if (r.ok) okCount += 1;
        else failCount += 1;
      } catch {
        failCount += 1;
      }
    }
    const cat = await fetch(`/api/contractor/suppliers/${selectedSupplierId}/catalog`, { credentials: 'include' });
    const cd = await cat.json();
    if (cat.ok) {
      setFenceStyles(cd.fenceStyles || []);
      setColours(cd.colourOptions || []);
    }
    setSelectedStyleIds(new Set());
    setStatus({
      kind: failCount > 0 ? 'error' : 'success',
      text:
        failCount > 0
          ? `Imported ${okCount}. ${failCount} failed or already imported.`
          : `Imported ${okCount} style${okCount === 1 ? '' : 's'}.`,
    });
    setBulkImporting(false);
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (accountType === 'supplier') {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">Supplier accounts manage contractors from Supplier workspace.</p>
        <Link href="/dashboard/supplier/contractor-management" className="mt-4 inline-block font-semibold text-blue-600">
          Open contractor management →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <div className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-slate-500">Workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Suppliers</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Choose suppliers on QuoteMyFence, then browse their catalog (without seeing their pricing) and import styles
          into your Products page. You set all customer-facing prices after import.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Directory</h2>
        <p className="mt-1 text-sm text-slate-600">Toggle suppliers you work with. Only linked suppliers can be browsed or receive layout requests.</p>
        <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {suppliers.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">No supplier companies on the platform yet.</li>
          ) : (
            suppliers.map((s) => {
              const linked = linkedIds.has(s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                        {s.company_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{s.company_name}</p>
                      <p className="truncate text-xs text-slate-500">{s.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {linked && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSupplierId(s.id);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                          selectedSupplierId === s.id
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Browse catalog
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => void toggleLink(s.id, linked)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        linked
                          ? 'border border-red-200 text-red-700 hover:bg-red-50'
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      } disabled:opacity-50`}
                    >
                      {busyId === s.id ? '…' : linked ? 'Unlink' : 'Link supplier'}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {linkedSuppliers.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Import catalog</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick a linked supplier above (Browse catalog), then import individual styles. Pricing is never copied —
            edit prices on{' '}
            <Link href="/dashboard/products" className="font-medium text-blue-600 hover:text-blue-500">
              Products
            </Link>
            .
          </p>

          {selectedSupplierId && linkedIds.has(selectedSupplierId) && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <p className="text-sm font-semibold text-slate-800">
                {supplierMeta?.company_name || 'Supplier'} — catalog preview
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={showImported}
                    onChange={(e) => setShowImported(e.target.checked)}
                  />
                  Show already imported
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={bulkMode}
                    onChange={(e) => {
                      setBulkMode(e.target.checked);
                      setSelectedStyleIds(new Set());
                    }}
                  />
                  Bulk import mode
                </label>
                <select
                  value={targetTypeId}
                  onChange={(e) => setTargetTypeId(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  <option value="">Create a new type per import</option>
                  {buyerTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      Import into: {t.name}
                    </option>
                  ))}
                </select>
                {bulkMode && (
                  <button
                    type="button"
                    disabled={!isAdmin || selectedStyleIds.size === 0 || bulkImporting}
                    onClick={() => void bulkImportSelected()}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-slate-300"
                  >
                    {bulkImporting ? 'Importing…' : `Import selected (${selectedStyleIds.size})`}
                  </button>
                )}
              </div>
              {status && (
                <p className={`mt-3 text-sm ${status.kind === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {status.text}
                </p>
              )}
              {catalogError && <p className="mt-2 text-sm text-red-600">{catalogError}</p>}
              {catalogLoading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
              {!catalogLoading && !catalogError && fenceStyles.length === 0 && (
                <p className="mt-3 text-sm text-slate-600">This supplier has not published fence styles yet.</p>
              )}
              {!catalogLoading && !catalogError && fenceStyles.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {fenceStyles.filter((st) => showImported || !st.already_imported).map((st) => {
                    const type = fenceTypes.find((t) => t.id === st.fence_type_id);
                    const styleColours = colours.filter((c) => c.fence_style_id === st.id);
                    const checked = selectedStyleIds.has(st.id);
                    return (
                      <li
                        key={st.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            {bulkMode && !st.already_imported && (
                              <label className="mb-1 inline-flex items-center gap-2 text-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedStyleIds((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(st.id);
                                      else next.delete(st.id);
                                      return next;
                                    });
                                  }}
                                />
                                Select
                              </label>
                            )}
                            <p className="text-xs font-medium uppercase text-slate-400">{type?.name || 'Type'}</p>
                            <p className="font-semibold text-slate-900">{st.style_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {styleColours.length} colour{styleColours.length === 1 ? '' : 's'} (import includes all)
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!isAdmin || st.already_imported || importingStyleId === st.id}
                            onClick={() => void importStyle(st.id)}
                            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {st.already_imported ? 'Imported' : importingStyleId === st.id ? 'Importing…' : 'Import to my products'}
                          </button>
                        </div>
                        {!isAdmin && (
                          <p className="mt-2 text-xs text-amber-800">Only company admins can import catalog items.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
