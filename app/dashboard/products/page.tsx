'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OptimizedProductImage } from '@/components/OptimizedProductImage';
import {
  StylePricingModal,
  type StyleInstallLengthTier,
  type StylePricingRule,
  type TierDraft,
} from '@/components/dashboard/StylePricingModal';
import { doubleGatePriceFromSingle } from '@/lib/gate-pricing';
import { uploadContractorAssetClient } from '@/lib/upload-contractor-asset-client';

interface FenceType {
  id: string;
  height_id: string | null;
  name: string;
  standard_height_ft?: number;
}

interface FenceStyle {
  id: string;
  fence_type_id: string;
  style_name: string;
  photo_url: string | null;
  is_hidden?: boolean;
}

interface ColourOption {
  id: string;
  fence_style_id: string;
  color_name: string;
  photo_url: string | null;
}

function byName<T>(get: (item: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b), undefined, { sensitivity: 'base', numeric: true });
}

const ADMIN_ROLES = ['owner', 'admin'];

const defaultRule = (styleId: string): StylePricingRule => ({
  fence_style_id: styleId,
  base_price_per_ft_low: 74.99,
  base_price_per_ft_high: 74.99,
  single_gate_low: 450,
  single_gate_high: 450,
  double_gate_low: doubleGatePriceFromSingle(450),
  double_gate_high: doubleGatePriceFromSingle(450),
  removal_price_per_ft_low: 5,
  removal_price_per_ft_high: 5,
  minimum_job_low: 0,
  minimum_job_high: 0,
});

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export default function ProductsPage() {
  const [types, setTypes] = useState<FenceType[]>([]);
  const [styles, setStyles] = useState<FenceStyle[]>([]);
  const [colours, setColours] = useState<ColourOption[]>([]);
  const [stylePricingRules, setStylePricingRules] = useState<StylePricingRule[]>([]);
  const [styleInstallLengthTiers, setStyleInstallLengthTiers] = useState<StyleInstallLengthTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());
  const didAutoExpand = useRef(false);

  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeHeight, setNewTypeHeight] = useState('6');
  const [addStyleTypeId, setAddStyleTypeId] = useState<string | null>(null);
  const [newStyleName, setNewStyleName] = useState('');
  const [addColourStyleId, setAddColourStyleId] = useState<string | null>(null);
  const [newColourName, setNewColourName] = useState('');
  const [pricingModal, setPricingModal] = useState<{
    styleId: string;
    styleName: string;
    rule: StylePricingRule;
  } | null>(null);
  const [editingHeightTypeId, setEditingHeightTypeId] = useState<string | null>(null);
  const [editHeightValue, setEditHeightValue] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const applyHierarchyData = useCallback((data: Record<string, unknown>) => {
    const nextTypes = ((data.fenceTypes as FenceType[]) || []).slice().sort(byName((t) => t.name || ''));
    const nextStyles = ((data.fenceStyles as FenceStyle[]) || []).slice().sort(byName((s) => s.style_name || ''));
    const nextColours = ((data.colourOptions as ColourOption[]) || []).slice().sort(byName((c) => c.color_name || ''));
    setTypes(nextTypes);
    setStyles(nextStyles);
    setColours(nextColours);
    setStylePricingRules((data.stylePricingRules as StylePricingRule[]) || []);
    setStyleInstallLengthTiers((data.styleInstallLengthTiers as StyleInstallLengthTier[]) || []);
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setRefreshing(true);
      try {
        const r = await fetch('/api/contractor/product-hierarchy', { cache: 'no-store' });
        const data = await r.json();
        if (r.ok) applyHierarchyData(data);
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [applyHierarchyData]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [meRes, hRes] = await Promise.all([
          fetch('/api/contractor/me'),
          fetch('/api/contractor/product-hierarchy', { cache: 'no-store' }),
        ]);
        const me = meRes.ok ? await meRes.json() : {};
        const data = hRes.ok ? await hRes.json() : {};
        if (cancelled) return;
        setIsAdmin(ADMIN_ROLES.includes(me?.user_role || ''));
        applyHierarchyData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyHierarchyData]);

  useEffect(() => {
    if (!loading && types.length > 0 && !didAutoExpand.current) {
      didAutoExpand.current = true;
      setExpandedTypes(new Set([types[0].id]));
    }
  }, [loading, types]);

  const getStyleRule = useCallback(
    (styleId: string) => stylePricingRules.find((r) => r.fence_style_id === styleId),
    [stylePricingRules]
  );

  const tiersForStyle = useCallback(
    (styleId: string) => styleInstallLengthTiers.filter((t) => t.fence_style_id === styleId),
    [styleInstallLengthTiers]
  );

  const stylesForType = useCallback((tId: string) => styles.filter((s) => s.fence_type_id === tId), [styles]);
  const coloursForStyle = useCallback((sId: string) => colours.filter((c) => c.fence_style_id === sId), [colours]);

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => {
      if (t.name.toLowerCase().includes(q)) return true;
      for (const s of stylesForType(t.id)) {
        if (s.style_name.toLowerCase().includes(q)) return true;
        for (const c of coloursForStyle(s.id)) {
          if (c.color_name.toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }, [types, search, stylesForType, coloursForStyle]);

  const stats = useMemo(() => {
    const typeCount = types.length;
    const styleCount = styles.length;
    const colourCount = colours.length;
    return { typeCount, styleCount, colourCount };
  }, [types, styles, colours]);

  function expandAllTypes() {
    setExpandedTypes(new Set(types.map((t) => t.id)));
  }

  function collapseAllTypes() {
    setExpandedTypes(new Set());
    setExpandedStyles(new Set());
  }

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/contractor/product-hierarchy/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTypeName.trim(),
        standard_height_ft: Number(newTypeHeight) || 6,
      }),
    });
    if (res.ok) {
      await refresh({ silent: true });
      setShowAddType(false);
      setNewTypeName('');
      setNewTypeHeight('6');
    }
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this fence type and all styles/colours under it?')) return;
    const res = await fetch(`/api/contractor/product-hierarchy/types/${id}`, { method: 'DELETE' });
    if (res.ok) await refresh({ silent: true });
  }

  async function addStyle(typeId: string) {
    const res = await fetch('/api/contractor/product-hierarchy/styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fence_type_id: typeId, style_name: newStyleName.trim() }),
    });
    if (res.ok) {
      await refresh({ silent: true });
      setAddStyleTypeId(null);
      setNewStyleName('');
    }
  }

  async function deleteStyle(id: string) {
    if (!confirm('Delete this style and all colours under it?')) return;
    const res = await fetch(`/api/contractor/product-hierarchy/styles/${id}`, { method: 'DELETE' });
    if (res.ok) await refresh({ silent: true });
  }

  async function addColour(styleId: string) {
    const res = await fetch('/api/contractor/product-hierarchy/colours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fence_style_id: styleId,
        color_name: newColourName.trim(),
      }),
    });
    if (res.ok) {
      await refresh({ silent: true });
      setAddColourStyleId(null);
      setNewColourName('');
    }
  }

  async function deleteColour(id: string) {
    if (!confirm('Delete this colour option?')) return;
    const res = await fetch(`/api/contractor/product-hierarchy/colours/${id}`, { method: 'DELETE' });
    if (res.ok) await refresh({ silent: true });
  }

  async function updateStylePhoto(styleId: string, file: File) {
    setUploadingPhoto(`style-${styleId}`);
    try {
      const uploaded = await uploadContractorAssetClient(file, 'style');
      if ('error' in uploaded) {
        alert(uploaded.error);
        return;
      }
      const { url } = uploaded;
      const patchRes = await fetch(`/api/contractor/product-hierarchy/styles/${styleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: url }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        alert(patchData?.error || 'Photo uploaded but could not save. Try again.');
        return;
      }
      const savedUrl = typeof patchData?.photo_url === 'string' ? patchData.photo_url : url;
      setStyles((prev) => prev.map((st) => (st.id === styleId ? { ...st, photo_url: savedUrl } : st)));
      await refresh({ silent: true });
    } catch {
      alert('Network error — check your connection and try again.');
    } finally {
      setUploadingPhoto(null);
    }
  }

  async function updateStyleHidden(styleId: string, hidden: boolean) {
    try {
      const patchRes = await fetch(`/api/contractor/product-hierarchy/styles/${styleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: hidden }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        alert(patchData?.error || 'Could not update visibility. Try again.');
        return;
      }
      setStyles((prev) => prev.map((st) => (st.id === styleId ? { ...st, is_hidden: hidden } : st)));
    } catch {
      alert('Network error — check your connection and try again.');
    }
  }

  async function updateColourPhoto(colourId: string, file: File) {
    setUploadingPhoto(`colour-${colourId}`);
    try {
      const uploaded = await uploadContractorAssetClient(file, 'colour');
      if ('error' in uploaded) {
        alert(uploaded.error);
        return;
      }
      const { url } = uploaded;
      const patchRes = await fetch(`/api/contractor/product-hierarchy/colours/${colourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: url }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        alert(patchData?.error || 'Photo uploaded but could not save. Try again.');
        return;
      }
      const savedUrl = typeof patchData?.photo_url === 'string' ? patchData.photo_url : url;
      setColours((prev) => prev.map((c) => (c.id === colourId ? { ...c, photo_url: savedUrl } : c)));
      await refresh({ silent: true });
    } catch {
      alert('Network error — check your connection and try again.');
    } finally {
      setUploadingPhoto(null);
    }
  }

  async function updateTypeStandardHeight(typeId: string, standard_height_ft: number) {
    const res = await fetch(`/api/contractor/product-hierarchy/types/${typeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standard_height_ft }),
    });
    if (res.ok) {
      setTypes((prev) => prev.map((t) => (t.id === typeId ? { ...t, standard_height_ft } : t)));
      setEditingHeightTypeId(null);
    }
  }

  async function updateStylePricing(styleId: string, updates: Partial<StylePricingRule>) {
    const res = await fetch('/api/contractor/product-hierarchy/style-pricing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fence_style_id: styleId, ...updates }),
    });
    if (res.ok) {
      const data = await res.json();
      setStylePricingRules((prev) => {
        const idx = prev.findIndex((r) => r.fence_style_id === styleId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...data };
          return next;
        }
        return [...prev, data];
      });
      setPricingModal(null);
    }
  }

  async function saveInstallLengthTiers(styleId: string, drafts: TierDraft[]) {
    const tiers = drafts.map((d) => {
      const min = Number(d.min_ft);
      const maxTrim = d.max_ft.trim();
      const max = maxTrim === '' ? null : Number(maxTrim);
      const p = Number(d.pricePerFt) || 0;
      const s = Number(d.singleGate) || 0;
      const dg = doubleGatePriceFromSingle(s);
      const rem = Number(d.removal) || 0;
      const mj = Number(d.minJob) || 0;
      return {
        min_ft: min,
        max_ft: max,
        base_price_per_ft_low: p,
        base_price_per_ft_high: p,
        single_gate_low: s,
        single_gate_high: s,
        double_gate_low: dg,
        double_gate_high: dg,
        removal_price_per_ft_low: rem,
        removal_price_per_ft_high: rem,
        minimum_job_low: mj,
        minimum_job_high: mj,
      };
    });
    const res = await fetch('/api/contractor/product-hierarchy/style-pricing/install-length-tiers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fence_style_id: styleId, tiers }),
    });
    if (res.ok) {
      const data = await res.json();
      const saved = (data.tiers as StyleInstallLengthTier[]) || [];
      setStyleInstallLengthTiers((prev) => {
        const without = prev.filter((t) => t.fence_style_id !== styleId);
        return [...without, ...saved];
      });
      setPricingModal(null);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || 'Could not save length bands.');
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-8">
      <div className="flex flex-col gap-4 border-b border-slate-200/90 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Catalog</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Products</h1>
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Updating…
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            {isAdmin
              ? "Types → styles → colours. Use Pricing → By install length on a style to set rates by total footage (e.g. 10'–20', 21'–30'). You can still use multiple style rows with range names for legacy tiering."
              : 'Your product catalog and pricing. Ask an admin to edit structure or prices.'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddType(true)}
            className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500"
          >
            Add fence type
          </button>
        )}
      </div>

      {/* Stats + toolbar */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Types', value: stats.typeCount },
            { label: 'Styles', value: stats.styleCount },
            { label: 'Colours', value: stats.colourCount },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md lg:max-w-sm">
          <label className="sr-only" htmlFor="product-search">
            Search catalog
          </label>
          <input
            id="product-search"
            type="search"
            placeholder="Search types, styles, colours…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {isAdmin && types.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={expandAllTypes}
                className="text-xs font-semibold text-blue-600 hover:text-blue-500"
              >
                Expand all
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAllTypes}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Jump strip */}
      {filteredTypes.length > 1 && (
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
          {filteredTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                document.getElementById(`product-type-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setExpandedTypes((prev) => new Set(prev).add(t.id));
              }}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-800"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {isAdmin && showAddType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Add fence type</h2>
            <form onSubmit={addType} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Type name</label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Vinyl, Cedar"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Standard height (ft)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="20"
                  value={newTypeHeight}
                  onChange={(e) => setNewTypeHeight(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddType(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pricingModal && (
        <StylePricingModal
          open
          styleName={pricingModal.styleName}
          rule={pricingModal.rule}
          installTiers={tiersForStyle(pricingModal.styleId)}
          onClose={() => setPricingModal(null)}
          onSave={(u) => updateStylePricing(pricingModal.styleId, u)}
          onSaveInstallTiers={(drafts) => saveInstallLengthTiers(pricingModal.styleId, drafts)}
        />
      )}

      <div className="mt-8 space-y-4">
        {filteredTypes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
            <p className="font-medium text-slate-800">
              {search ? 'No matches for that search.' : 'No fence types yet.'}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
              {search
                ? 'Try another term or clear the search box.'
                : isAdmin
                  ? 'Add a type (e.g. Vinyl) and set a standard height to start your catalog.'
                  : 'Your admin can add product types for you.'}
            </p>
          </div>
        )}

        {filteredTypes.map((t) => (
          <section
            key={t.id}
            id={`product-type-${t.id}`}
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setExpandedTypes((prev) => {
                    const n = new Set(prev);
                    n.has(t.id) ? n.delete(t.id) : n.add(t.id);
                    return n;
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Chevron open={expandedTypes.has(t.id)} />
                <div className="min-w-0">
                  <span className="text-lg font-bold text-slate-900">{t.name}</span>
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {stylesForType(t.id).length} styles · {t.standard_height_ft ?? 6} ft default
                  </span>
                </div>
              </button>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  {editingHeightTypeId === t.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="20"
                        value={editHeightValue}
                        onChange={(e) => setEditHeightValue(e.target.value)}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => updateTypeStandardHeight(t.id, Number(editHeightValue) || 6)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHeightTypeId(null);
                          setEditHeightValue('');
                        }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHeightTypeId(t.id);
                        setEditHeightValue(String(t.standard_height_ft ?? 6));
                      }}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900"
                    >
                      Height
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAddStyleTypeId(t.id);
                      setNewStyleName('');
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    + Style
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteType(t.id)}
                    className="rounded-lg px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {expandedTypes.has(t.id) && (
              <div className="space-y-3 bg-slate-50/40 p-4 sm:p-6">
                {isAdmin && addStyleTypeId === t.id && (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <input
                      type="text"
                      value={newStyleName}
                      onChange={(e) => setNewStyleName(e.target.value)}
                      placeholder="Style name (e.g. Privacy)"
                      className="min-w-[160px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addStyle(t.id)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddStyleTypeId(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {stylesForType(t.id).length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">No styles yet. Add one to continue.</p>
                )}

                {stylesForType(t.id).map((s) => {
                  const styleRule = getStyleRule(s.id);
                  const lengthTiers = tiersForStyle(s.id);
                  return (
                    <div
                      key={s.id}
                      className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {s.photo_url?.trim() ? (
                            <OptimizedProductImage
                              key={s.photo_url}
                              src={s.photo_url.trim()}
                              alt={s.style_name}
                              fill
                              sizes="56px"
                              className="object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Photo</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedStyles((prev) => {
                                  const n = new Set(prev);
                                  n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                                  return n;
                                })
                              }
                              className="flex items-center gap-2 text-left"
                            >
                              <Chevron open={expandedStyles.has(s.id)} />
                              <span className="font-semibold text-slate-900">{s.style_name}</span>
                              {s.is_hidden ? (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                  Hidden from customers
                                </span>
                              ) : null}
                              {lengthTiers.length > 0 ? (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                  {lengthTiers.length} length band{lengthTiers.length === 1 ? '' : 's'}
                                </span>
                              ) : (
                                styleRule && (
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    ${Number(styleRule.base_price_per_ft_low).toFixed(2)}/ft
                                  </span>
                                )
                              )}
                            </button>
                            {isAdmin && (
                              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={!!s.is_hidden}
                                    onChange={(e) => updateStyleHidden(s.id, e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300"
                                  />
                                  Hidden
                                </label>
                                <label
                                  className={
                                    uploadingPhoto === `style-${s.id}`
                                      ? 'cursor-wait text-xs text-slate-400'
                                      : 'cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'
                                  }
                                >
                                  {uploadingPhoto === `style-${s.id}` ? 'Uploading…' : 'Photo'}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
                                    className="hidden"
                                    disabled={!!uploadingPhoto}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        updateStylePhoto(s.id, f);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPricingModal({
                                      styleId: s.id,
                                      styleName: s.style_name,
                                      rule: styleRule ?? defaultRule(s.id),
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  {styleRule ? 'Pricing' : 'Set pricing'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddColourStyleId(s.id);
                                    setNewColourName('');
                                  }}
                                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                                >
                                  + Colour
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteStyle(s.id)}
                                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedStyles.has(s.id) && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                          {isAdmin && addColourStyleId === s.id && (
                            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
                              <input
                                type="text"
                                value={newColourName}
                                onChange={(e) => setNewColourName(e.target.value)}
                                placeholder="Colour name"
                                className="min-w-[140px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => addColour(s.id)}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Add colour
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddColourStyleId(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {coloursForStyle(s.id).length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-500">No colours — add options customers can pick.</p>
                          ) : (
                            <ul className="space-y-2">
                              {coloursForStyle(s.id).map((c) => {
                                const sr = getStyleRule(s.id);
                                return (
                                  <li
                                    key={c.id}
                                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center"
                                  >
                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                      {c.photo_url?.trim() ? (
                                        <OptimizedProductImage
                                          key={c.photo_url}
                                          src={c.photo_url.trim()}
                                          alt={c.color_name}
                                          fill
                                          sizes="56px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-[10px] text-slate-400">—</div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-900">{c.color_name}</p>
                                      {sr && (
                                        <p className="mt-1 text-xs text-slate-500">
                                          ${Number(sr.base_price_per_ft_low).toFixed(2)}/ft · gates ${Number(sr.single_gate_low).toFixed(0)} / ${Number(sr.double_gate_low).toFixed(0)}
                                          {sr.removal_price_per_ft_low > 0 && (
                                            <> · removal ${Number(sr.removal_price_per_ft_low).toFixed(2)}/ft</>
                                          )}
                                          <span className="text-slate-400"> (from style)</span>
                                        </p>
                                      )}
                                    </div>
                                    {isAdmin && (
                                      <div className="flex shrink-0 gap-2">
                                        <label
                                          className={
                                            uploadingPhoto === `colour-${c.id}`
                                              ? 'cursor-wait text-xs text-slate-400'
                                              : 'cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50'
                                          }
                                        >
                                          {uploadingPhoto === `colour-${c.id}` ? '…' : 'Photo'}
                                          <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
                                            className="hidden"
                                            disabled={!!uploadingPhoto}
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) {
                                                updateColourPhoto(c.id, f);
                                                e.target.value = '';
                                              }
                                            }}
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => deleteColour(c.id)}
                                          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
