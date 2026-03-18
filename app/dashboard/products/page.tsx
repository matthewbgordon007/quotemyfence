'use client';

import { useState, useEffect } from 'react';
import { OptimizedProductImage } from '@/components/OptimizedProductImage';

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
}

interface ColourOption {
  id: string;
  fence_style_id: string;
  color_name: string;
  photo_url: string | null;
}

interface StylePricingRule {
  fence_style_id: string;
  base_price_per_ft_low: number;
  base_price_per_ft_high: number;
  single_gate_low: number;
  single_gate_high: number;
  double_gate_low: number;
  double_gate_high: number;
  removal_price_per_ft_low: number;
  removal_price_per_ft_high: number;
  minimum_job_low: number;
  minimum_job_high: number;
}

const ADMIN_ROLES = ['owner', 'admin'];

export default function ProductsPage() {
  const [types, setTypes] = useState<FenceType[]>([]);
  const [styles, setStyles] = useState<FenceStyle[]>([]);
  const [colours, setColours] = useState<ColourOption[]>([]);
  const [stylePricingRules, setStylePricingRules] = useState<StylePricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeHeight, setNewTypeHeight] = useState('6');
  const [addStyleTypeId, setAddStyleTypeId] = useState<string | null>(null);
  const [newStyleName, setNewStyleName] = useState('');
  const [addColourStyleId, setAddColourStyleId] = useState<string | null>(null);
  const [newColourName, setNewColourName] = useState('');
  const [editingStylePricing, setEditingStylePricing] = useState<string | null>(null);
  const [editingHeightTypeId, setEditingHeightTypeId] = useState<string | null>(null);
  const [editHeightValue, setEditHeightValue] = useState('');

  function refresh() {
    fetch('/api/contractor/product-hierarchy', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setTypes(data.fenceTypes || []);
        setStyles(data.fenceStyles || []);
        setColours(data.colourOptions || []);
        setStylePricingRules(data.stylePricingRules || []);
      });
  }

  useEffect(() => {
    fetch('/api/contractor/me')
      .then((r) => r.json())
      .then((data) => setIsAdmin(ADMIN_ROLES.includes(data?.user_role || '')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, []);

  function getStyleRule(styleId: string) {
    return stylePricingRules.find((r) => r.fence_style_id === styleId);
  }

  function stylesForType(tId: string) {
    return styles.filter((s) => s.fence_type_id === tId);
  }
  function coloursForStyle(sId: string) {
    return colours.filter((c) => c.fence_style_id === sId);
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
      refresh();
      setShowAddType(false);
      setNewTypeName('');
      setNewTypeHeight('6');
    }
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this fence type and all styles/colours under it?')) return;
    const res = await fetch(`/api/contractor/product-hierarchy/types/${id}`, { method: 'DELETE' });
    if (res.ok) refresh();
  }

  async function addStyle(typeId: string) {
    const res = await fetch('/api/contractor/product-hierarchy/styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fence_type_id: typeId, style_name: newStyleName.trim() }),
    });
    if (res.ok) {
      refresh();
      setAddStyleTypeId(null);
      setNewStyleName('');
    }
  }

  async function deleteStyle(id: string) {
    if (!confirm('Delete this style and all colours under it?')) return;
    const res = await fetch(`/api/contractor/product-hierarchy/styles/${id}`, { method: 'DELETE' });
    if (res.ok) refresh();
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
      refresh();
      setAddColourStyleId(null);
      setNewColourName('');
    }
  }

  async function deleteColour(id: string) {
    if (!confirm('Delete this colour option?')) return;
    const res = await fetch(`/api/contractor/product-hierarchy/colours/${id}`, { method: 'DELETE' });
    if (res.ok) refresh();
  }

  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  async function updateStylePhoto(styleId: string, file: File) {
    setUploadingPhoto(`style-${styleId}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'style');
      const res = await fetch('/api/contractor/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || 'Upload failed. Use JPG, PNG, WebP, GIF or HEIC (max 5MB).');
        return;
      }
      const patchRes = await fetch(`/api/contractor/product-hierarchy/styles/${styleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: data.url }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        alert(patchData?.error || 'Photo uploaded but could not save. Try again.');
        return;
      }
      setStyles((prev) => prev.map((st) => (st.id === styleId ? { ...st, photo_url: data.url } : st)));
      refresh();
    } finally {
      setUploadingPhoto(null);
    }
  }

  async function updateColourPhoto(colourId: string, file: File) {
    setUploadingPhoto(`colour-${colourId}`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'colour');
      const res = await fetch('/api/contractor/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || 'Upload failed. Use JPG, PNG, WebP, GIF or HEIC (max 5MB).');
        return;
      }
      const patchRes = await fetch(`/api/contractor/product-hierarchy/colours/${colourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: data.url }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        alert(patchData?.error || 'Photo uploaded but could not save. Try again.');
        return;
      }
      setColours((prev) => prev.map((c) => (c.id === colourId ? { ...c, photo_url: data.url } : c)));
      refresh();
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
      setEditingStylePricing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isAdmin ? 'Add fence types (with standard height), then styles and colours under each. Customers pick type → style → colour when designing.' : 'View your product catalog and pricing. Contact an admin to make changes.'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddType(true)}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            Add fence type
          </button>
        )}
      </div>

      {isAdmin && showAddType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xl">
            <h2 className="font-bold">Add fence type</h2>
            <form onSubmit={addType} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Type name</label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Vinyl, Cedar"
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Standard height (ft)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="20"
                  value={newTypeHeight}
                  onChange={(e) => setNewTypeHeight(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white">
                  Add
                </button>
                <button type="button" onClick={() => setShowAddType(false)} className="rounded-lg border px-4 py-2">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {types.length === 0 && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-12 text-center text-[var(--muted)]">
            No fence types yet. Add a type (e.g. Vinyl, Cedar) and set its standard height to start building your catalog.
          </div>
        )}
        {types.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-6 py-4">
              <button
                type="button"
                onClick={() => setExpandedTypes((prev) => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span className="text-[var(--muted)]">{expandedTypes.has(t.id) ? '▼' : '▶'}</span>
                <span className="font-bold">{t.name}</span>
                <span className="text-xs text-[var(--muted)]">({t.standard_height_ft ?? 6} ft standard)</span>
              </button>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  {editingHeightTypeId === t.id ? (
                    <>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="20"
                        value={editHeightValue}
                        onChange={(e) => setEditHeightValue(e.target.value)}
                        className="w-16 rounded border border-[var(--line)] px-2 py-1 text-sm"
                      />
                      <button type="button" onClick={() => updateTypeStandardHeight(t.id, Number(editHeightValue) || 6)} className="text-xs text-[var(--accent)] hover:underline">Save</button>
                      <button type="button" onClick={() => { setEditingHeightTypeId(null); setEditHeightValue(''); }} className="text-xs text-[var(--muted)] hover:underline">Cancel</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setEditingHeightTypeId(t.id); setEditHeightValue(String(t.standard_height_ft ?? 6)); }} className="text-sm font-medium text-[var(--accent)] hover:underline">
                      Set height
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setAddStyleTypeId(t.id); setNewStyleName(''); }}
                    className="text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    + Style
                  </button>
                  <button type="button" onClick={() => deleteType(t.id)} className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              )}
            </div>

            {expandedTypes.has(t.id) && (
              <div className="border-t border-[var(--line)] bg-[var(--bg2)]/50 p-6">
                {isAdmin && addStyleTypeId === t.id && (
                  <div className="mb-4 flex gap-2 rounded-lg border border-[var(--line)] bg-white p-4">
                    <input
                      type="text"
                      value={newStyleName}
                      onChange={(e) => setNewStyleName(e.target.value)}
                      placeholder="e.g. Privacy, Semi-Privacy"
                      className="flex-1 rounded border px-3 py-2"
                    />
                    <button type="button" onClick={() => addStyle(t.id)} className="rounded bg-[var(--accent)] px-3 py-2 text-white">
                      Add
                    </button>
                    <button type="button" onClick={() => setAddStyleTypeId(null)} className="rounded border px-3 py-2">
                      Cancel
                    </button>
                  </div>
                )}

                {stylesForType(t.id).map((s) => {
                  const styleRule = getStyleRule(s.id);
                  const isEditingStylePricing = editingStylePricing === s.id;
                  return (
                  <div key={s.id} className="mb-4 rounded-xl border border-[var(--line)] bg-white">
                    <div className="flex items-center gap-4 px-4 py-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white">
                        {s.photo_url ? (
                          <OptimizedProductImage key={s.photo_url} src={s.photo_url} alt={s.style_name} fill sizes="48px" className="object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedStyles((prev) => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                            className="text-sm font-medium"
                          >
                            {expandedStyles.has(s.id) ? '▼' : '▶'} {s.style_name}
                          </button>
                          {isAdmin && (
                            <div className="flex flex-wrap items-center gap-2">
                              {styleRule && !isEditingStylePricing && (
                                <span className="text-xs text-[var(--muted)]">
                                  ${Number(styleRule.base_price_per_ft_low).toLocaleString('en-CA', { minimumFractionDigits: 2 })}/ft
                                </span>
                              )}
                              <label className={uploadingPhoto === `style-${s.id}` ? 'cursor-wait text-xs text-[var(--muted)]' : 'cursor-pointer text-xs text-[var(--accent)] hover:underline'}>
                                {uploadingPhoto === `style-${s.id}` ? 'Uploading…' : 'Upload photo (JPG, PNG, WebP, GIF, HEIC)'}
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
                                onClick={() => setEditingStylePricing(isEditingStylePricing ? null : s.id)}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                {styleRule ? 'Edit pricing' : 'Set pricing'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAddColourStyleId(s.id); setNewColourName(''); }}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                + Colour
                              </button>
                              <button type="button" onClick={() => deleteStyle(s.id)} className="text-xs text-red-600 hover:underline">
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {isAdmin && isEditingStylePricing && (
                          <StylePricingForm
                            rule={styleRule ?? { fence_style_id: s.id, base_price_per_ft_low: 74.99, base_price_per_ft_high: 74.99, single_gate_low: 450, single_gate_high: 450, double_gate_low: 800, double_gate_high: 800, removal_price_per_ft_low: 5, removal_price_per_ft_high: 5, minimum_job_low: 500, minimum_job_high: 500 }}
                            onSave={(u) => updateStylePricing(s.id, u)}
                            onCancel={() => setEditingStylePricing(null)}
                          />
                        )}
                      </div>
                    </div>

                    {expandedStyles.has(s.id) && (
                      <div className="border-t border-[var(--line)] p-4">
                        {isAdmin && addColourStyleId === s.id && (
                          <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-white p-4">
                            <input
                              type="text"
                              value={newColourName}
                              onChange={(e) => setNewColourName(e.target.value)}
                              placeholder="Colour name (e.g. White, Brown)"
                              className="min-w-[120px] flex-1 rounded border px-3 py-2"
                            />
                            <div className="flex items-end gap-2">
                              <button type="button" onClick={() => addColour(s.id)} className="rounded bg-[var(--accent)] px-3 py-2 text-white">
                                Add colour
                              </button>
                              <button type="button" onClick={() => setAddColourStyleId(null)} className="rounded border px-3 py-2">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {coloursForStyle(s.id).map((c) => {
                          const styleRule = getStyleRule(s.id);
                          return (
                            <div key={c.id} className="flex items-start gap-4 rounded-lg border border-[var(--line)] bg-[var(--bg2)]/30 p-4">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[var(--bg2)]">
                                {c.photo_url ? (
                                  <OptimizedProductImage key={c.photo_url} src={c.photo_url} alt={c.color_name} fill sizes="64px" className="object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{c.color_name}</div>
                                {isAdmin && (
                                  <div className="mt-1 flex gap-2">
                                    <label className={uploadingPhoto === `colour-${c.id}` ? 'cursor-wait text-xs text-[var(--muted)]' : 'cursor-pointer text-xs text-[var(--accent)] hover:underline'}>
                                      {uploadingPhoto === `colour-${c.id}` ? 'Uploading…' : 'Upload photo (JPG, PNG, WebP, GIF, HEIC)'}
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
                                    <button type="button" onClick={() => deleteColour(c.id)} className="text-xs text-red-600 hover:underline">
                                      Delete
                                    </button>
                                  </div>
                                )}
                                {styleRule && (
                                  <div className="mt-1 text-xs text-[var(--muted)]">
                                    <span>${Number(styleRule.base_price_per_ft_low).toLocaleString('en-CA', { minimumFractionDigits: 2 })}/ft</span>
                                    <span className="mx-1">•</span>
                                    <span>Single gate ${Number(styleRule.single_gate_low).toLocaleString('en-CA', { minimumFractionDigits: 0 })}</span>
                                    <span className="mx-1">•</span>
                                    <span>Double gate ${Number(styleRule.double_gate_low).toLocaleString('en-CA', { minimumFractionDigits: 0 })}</span>
                                    {styleRule.removal_price_per_ft_low > 0 && (
                                      <>
                                        <span className="mx-1">•</span>
                                        <span>Removal ${Number(styleRule.removal_price_per_ft_low).toLocaleString('en-CA', { minimumFractionDigits: 2 })}/ft</span>
                                      </>
                                    )}
                                    <span className="ml-1 text-[var(--muted)]">(inherited from style)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StylePricingForm({
  rule,
  onSave,
  onCancel,
}: {
  rule: StylePricingRule;
  onSave: (u: Partial<StylePricingRule>) => void;
  onCancel: () => void;
}) {
  const [pricePerFt, setPricePerFt] = useState(String(rule.base_price_per_ft_low));
  const [singleGate, setSingleGate] = useState(String(rule.single_gate_low));
  const [doubleGate, setDoubleGate] = useState(String(rule.double_gate_low));
  const [removal, setRemoval] = useState(String(rule.removal_price_per_ft_low));
  const [minJob, setMinJob] = useState(String(rule.minimum_job_low));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(pricePerFt) || 0;
        const s = Number(singleGate) || 0;
        const d = Number(doubleGate) || 0;
        const r = Number(removal) || 0;
        const m = Number(minJob) || 0;
        onSave({
          base_price_per_ft_low: p,
          base_price_per_ft_high: p,
          single_gate_low: s,
          single_gate_high: s,
          double_gate_low: d,
          double_gate_high: d,
          removal_price_per_ft_low: r,
          removal_price_per_ft_high: r,
          minimum_job_low: m,
          minimum_job_high: m,
        });
      }}
      className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      <div>
        <label className="block text-xs">Price $/ft</label>
        <input type="number" step="0.01" value={pricePerFt} onChange={(e) => setPricePerFt(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs">Single gate $</label>
        <input type="number" step="0.01" value={singleGate} onChange={(e) => setSingleGate(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs">Double gate $</label>
        <input type="number" step="0.01" value={doubleGate} onChange={(e) => setDoubleGate(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs">Removal $/ft</label>
        <input type="number" step="0.01" value={removal} onChange={(e) => setRemoval(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs">Min job $</label>
        <input type="number" step="0.01" value={minJob} onChange={(e) => setMinJob(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-sm" />
      </div>
      <div className="col-span-2 flex gap-2 pt-2">
        <button type="submit" className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white">
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-3 py-1.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
