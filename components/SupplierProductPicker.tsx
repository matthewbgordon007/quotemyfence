'use client';

import { useEffect, useMemo, useState } from 'react';

type CatalogFenceType = { id: string; name: string; standard_height_ft?: number | null };
type CatalogFenceStyle = {
  id: string;
  fence_type_id: string;
  style_name: string;
  visibility_target?: string | null;
};
type CatalogColour = { id: string; fence_style_id: string; color_name: string };

export type SupplierProductValue = {
  fenceTypeId: string;
  fenceStyleId: string;
  colourOptionId: string;
};

type Props = {
  supplierId: string;
  value: SupplierProductValue;
  onChange: (value: SupplierProductValue) => void;
  onReadyChange?: (ready: boolean) => void;
};

function byName<T>(get: (item: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b), undefined, { sensitivity: 'base', numeric: true });
}

export function isSupplierProductSelectionComplete(
  fenceTypes: CatalogFenceType[],
  fenceStyles: CatalogFenceStyle[],
  colourOptions: CatalogColour[],
  value: SupplierProductValue
): boolean {
  if (fenceTypes.length === 0) return false;
  if (!value.fenceTypeId) return false;

  const stylesForType = fenceStyles.filter((s) => s.fence_type_id === value.fenceTypeId);
  if (stylesForType.length > 0 && !value.fenceStyleId) return false;

  if (value.fenceStyleId) {
    const coloursForStyle = colourOptions.filter((c) => c.fence_style_id === value.fenceStyleId);
    if (coloursForStyle.length > 0 && !value.colourOptionId) return false;
  }

  return true;
}

export function SupplierProductPicker({ supplierId, value, onChange, onReadyChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fenceTypes, setFenceTypes] = useState<CatalogFenceType[]>([]);
  const [fenceStyles, setFenceStyles] = useState<CatalogFenceStyle[]>([]);
  const [colourOptions, setColourOptions] = useState<CatalogColour[]>([]);

  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFenceTypes([]);
    setFenceStyles([]);
    setColourOptions([]);
    onChange({ fenceTypeId: '', fenceStyleId: '', colourOptionId: '' });

    fetch(`/api/contractor/suppliers/${supplierId}/catalog`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || 'Failed to load catalog');
        const types = [...(d.fenceTypes || [])].sort(byName((t: CatalogFenceType) => t.name || ''));
        const styles = [...(d.fenceStyles || [])].sort(byName((s: CatalogFenceStyle) => s.style_name || ''));
        const colours = [...(d.colourOptions || [])].sort(byName((c: CatalogColour) => c.color_name || ''));
        setFenceTypes(types);
        setFenceStyles(styles);
        setColourOptions(colours);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load catalog');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset selection when supplier changes
  }, [supplierId]);

  const stylesForType = useMemo(
    () => fenceStyles.filter((s) => s.fence_type_id === value.fenceTypeId),
    [fenceStyles, value.fenceTypeId]
  );
  const coloursForStyle = useMemo(
    () => colourOptions.filter((c) => c.fence_style_id === value.fenceStyleId),
    [colourOptions, value.fenceStyleId]
  );

  const ready = isSupplierProductSelectionComplete(fenceTypes, fenceStyles, colourOptions, value);

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  return (
    <div className="mt-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-slate-50/80 p-4">
      <p className="text-sm font-medium text-[var(--text,#0f172a)]">Product from supplier catalog</p>
      <p className="mt-0.5 text-xs text-[var(--muted,#64748b)]">
        Pick the fence product (e.g. PVC, Adobe) so the supplier knows which material list to build.
      </p>

      {loading && <p className="mt-3 text-sm text-[var(--muted,#64748b)]">Loading catalog…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!loading && !error && fenceTypes.length === 0 && (
        <p className="mt-3 text-sm text-amber-800">
          This supplier has no products in their catalog yet. Ask them to add products, or send to the platform team
          instead.
        </p>
      )}

      {!loading && !error && fenceTypes.length > 0 && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted,#64748b)]">Product type</label>
            <select
              value={value.fenceTypeId}
              onChange={(e) =>
                onChange({ fenceTypeId: e.target.value, fenceStyleId: '', colourOptionId: '' })
              }
              className="mt-1 w-full rounded-lg border border-[var(--line,#e2e8f0)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent,#2563eb)]"
            >
              <option value="">Select product…</option>
              {fenceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.standard_height_ft != null ? ` (${t.standard_height_ft} ft)` : ''}
                </option>
              ))}
            </select>
          </div>

          {value.fenceTypeId && stylesForType.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted,#64748b)]">Style</label>
              <select
                value={value.fenceStyleId}
                onChange={(e) =>
                  onChange({ ...value, fenceStyleId: e.target.value, colourOptionId: '' })
                }
                className="mt-1 w-full rounded-lg border border-[var(--line,#e2e8f0)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent,#2563eb)]"
              >
                <option value="">Select style…</option>
                {stylesForType.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.style_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {value.fenceStyleId && coloursForStyle.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted,#64748b)]">Colour</label>
              <select
                value={value.colourOptionId}
                onChange={(e) => onChange({ ...value, colourOptionId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--line,#e2e8f0)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent,#2563eb)]"
              >
                <option value="">Select colour…</option>
                {coloursForStyle.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.color_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
