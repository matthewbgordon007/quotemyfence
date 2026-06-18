'use client';

import { useCallback, useState } from 'react';
import {
  DEFAULT_FMS_CALCULATOR_RECIPE,
  PER_PANEL_CATALOG_SLOT,
  newFmsCatalogProductId,
  normalizeFmsCalculatorRecipe,
  type FmsCalculatorRecipeV1,
  type FmsGateRecipeAddons,
  type FmsProductCatalogItem,
  type FmsProductSlot,
} from '@/lib/fms-calculator-recipe';

const card =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const h2 = 'text-base font-semibold text-slate-900';
const field =
  'rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500';
const btn =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50';
const btnAlt = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50';
const btnDanger =
  'rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40';

type Props = {
  recipe: FmsCalculatorRecipeV1;
  canEdit: boolean;
  onChange: (recipe: FmsCalculatorRecipeV1) => void;
  onSave: () => Promise<void>;
};

function perPanelKeyForSlot(
  slot: FmsProductSlot
): keyof FmsCalculatorRecipeV1['fence']['per_panel'] | null {
  for (const [key, mapped] of Object.entries(PER_PANEL_CATALOG_SLOT) as [
    keyof FmsCalculatorRecipeV1['fence']['per_panel'],
    FmsProductSlot,
  ][]) {
    if (mapped === slot) return key;
  }
  return null;
}

function builtinSlotHint(slot?: FmsProductSlot): string {
  if (!slot) return 'Custom';
  if (slot === 'cap_h_post') return 'Fence detail';
  return 'Built-in';
}

function numInput(
  value: number,
  onChange: (n: number) => void,
  disabled: boolean,
  step = 0.01
) {
  return (
    <input
      type="number"
      step={step}
      min={0}
      disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${field} w-full`}
    />
  );
}

const GATE_ADDON_FIELDS: { key: keyof FmsGateRecipeAddons; label: string }[] = [
  { key: 'long_screw_base', label: 'Large screw base' },
  { key: 'plug_formula_add', label: 'Plug formula add' },
  { key: 'u_channel', label: 'U-channel' },
  { key: 'overhead_brace', label: 'Overhead brace' },
  { key: 'diagonal_brace', label: 'Diagonal brace' },
  { key: 'latch', label: 'Latch' },
  { key: 'hinge', label: 'Hinge' },
  { key: 'h_post_stiffener', label: 'H-post stiffener' },
];

export function FmsCalculatorRecipeEditor({ recipe, canEdit, onChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);

  const patch = useCallback(
    (fn: (prev: FmsCalculatorRecipeV1) => FmsCalculatorRecipeV1) => {
      onChange(normalizeFmsCalculatorRecipe(fn(recipe)));
    },
    [onChange, recipe]
  );

  const updateCatalogItem = useCallback(
    (id: string, updates: Partial<FmsProductCatalogItem>) => {
      patch((p) => ({
        ...p,
        product_catalog: p.product_catalog.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      }));
    },
    [patch]
  );

  const removeCatalogItem = useCallback(
    (item: FmsProductCatalogItem) => {
      if (!canEdit) return;
      if (item.slot) {
        updateCatalogItem(item.id, { enabled: false });
        return;
      }
      patch((p) => ({
        ...p,
        product_catalog: p.product_catalog.filter((row) => row.id !== item.id),
      }));
    },
    [canEdit, patch, updateCatalogItem]
  );

  const addCustomProduct = useCallback(() => {
    if (!canEdit) return;
    patch((p) => ({
      ...p,
      product_catalog: [
        ...p.product_catalog,
        {
          id: newFmsCatalogProductId(),
          label: 'New product',
          enabled: true,
          qty_per_panel: 1,
          surfaces: ['master'],
        },
      ],
    }));
  }, [canEdit, patch]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    if (!canEdit) return;
    if (!window.confirm('Reset all calculator settings to FMS defaults?')) return;
    onChange(normalizeFmsCalculatorRecipe(DEFAULT_FMS_CALCULATOR_RECIPE));
  }

  const visibleCatalog = recipe.product_catalog;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-950">
        <strong className="font-semibold">Product setup</strong> — rename products to match your catalog, hide lines you
        don&apos;t sell, and add custom items (qty × panel count). Formulas stay the same; only names and visibility
        change on PDFs and material lists.
      </div>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-emerald-50/30 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={h2}>Product catalog</h2>
              <p className="mt-1 text-xs text-slate-500">
                Edit names, hide built-in lines, or add your own products. Disabled built-ins stay in setup but won&apos;t
                appear on lists.
              </p>
            </div>
            {canEdit ? (
              <button type="button" className={btnAlt} onClick={addCustomProduct}>
                + Add product
              </button>
            ) : null}
          </div>
        </div>
        <div className="overflow-x-auto p-5">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Product name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Qty / panel</th>
                <th className="px-3 py-2">Master list</th>
                <th className="px-3 py-2">Fence rollup</th>
                <th className="px-3 py-2">On</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCatalog.map((item) => {
                const perPanelKey = item.slot ? perPanelKeyForSlot(item.slot) : null;
                const isCustom = !item.slot;
                const surfaces = item.surfaces ?? ['master'];
                const rowMuted = !item.enabled;

                return (
                  <tr key={item.id} className={rowMuted ? 'bg-slate-50/80 opacity-60' : undefined}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={item.label}
                        onChange={(e) => updateCatalogItem(item.id, { label: e.target.value })}
                        className={`${field} min-w-[10rem]`}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{builtinSlotHint(item.slot)}</td>
                    <td className="px-3 py-2">
                      {isCustom ? (
                        numInput(
                          item.qty_per_panel ?? 1,
                          (n) => updateCatalogItem(item.id, { qty_per_panel: n }),
                          !canEdit
                        )
                      ) : perPanelKey ? (
                        numInput(
                          recipe.fence.per_panel[perPanelKey],
                          (n) =>
                            patch((p) => ({
                              ...p,
                              fence: {
                                ...p.fence,
                                per_panel: { ...p.fence.per_panel, [perPanelKey]: n },
                              },
                            })),
                          !canEdit
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isCustom ? (
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={surfaces.includes('master')}
                          onChange={(e) => {
                            const next = new Set(surfaces);
                            if (e.target.checked) next.add('master');
                            else next.delete('master');
                            updateCatalogItem(item.id, {
                              surfaces: Array.from(next) as ('master' | 'fence')[],
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      ) : (
                        <span className="text-xs text-emerald-700">✓</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isCustom ? (
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={surfaces.includes('fence')}
                          onChange={(e) => {
                            const next = new Set(surfaces);
                            if (e.target.checked) next.add('fence');
                            else next.delete('fence');
                            updateCatalogItem(item.id, {
                              surfaces: Array.from(next) as ('master' | 'fence')[],
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      ) : perPanelKey || item.slot === 'cap_h_post' ? (
                        <span className="text-xs text-emerald-700">✓</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={item.enabled}
                        onChange={(e) => updateCatalogItem(item.id, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() => removeCatalogItem(item)}
                          title={item.slot ? 'Hide from lists' : 'Delete product'}
                        >
                          {item.slot ? 'Hide' : 'Delete'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recipe.product_catalog.some((p) => !p.enabled && p.slot) ? (
            <p className="mt-3 text-xs text-slate-500">
              Hidden built-in products are dimmed above — turn them back on with the checkbox.
            </p>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
          <h2 className={h2}>Panel spacing</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">7 ft panel spacing (ft)</label>
            {numInput(
              recipe.fence.panel_spacing_ft.nominal_7ft,
              (n) =>
                patch((p) => ({
                  ...p,
                  fence: {
                    ...p.fence,
                    panel_spacing_ft: { ...p.fence.panel_spacing_ft, nominal_7ft: n },
                  },
                })),
              !canEdit,
              0.000001
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">6 ft panel spacing (ft)</label>
            {numInput(
              recipe.fence.panel_spacing_ft.nominal_6ft,
              (n) =>
                patch((p) => ({
                  ...p,
                  fence: {
                    ...p.fence,
                    panel_spacing_ft: { ...p.fence.panel_spacing_ft, nominal_6ft: n },
                  },
                })),
              !canEdit
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">6 ft board multiplier</label>
            {numInput(
              recipe.fence.board_multiplier_6ft,
              (n) => patch((p) => ({ ...p, fence: { ...p.fence, board_multiplier_6ft: n } })),
              !canEdit
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Concrete bags per H-post</label>
            {numInput(
              recipe.concrete_bags_per_h_post,
              (n) => patch((p) => ({ ...p, concrete_bags_per_h_post: n })),
              !canEdit
            )}
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className={h2}>Pack sizes &amp; master rollups</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['board_per_pack', 'Boards per pack'],
              ['board_stiffeners_per_pack', 'Board stiffeners per pack'],
              ['rail_per_pack', 'Rails per pack'],
              ['rail_stiffeners_per_pack', 'Rail stiffeners per pack'],
              ['u_channel_per_pack', 'U-channels per pack'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              {numInput(
                recipe.packs[key],
                (n) => patch((p) => ({ ...p, packs: { ...p.packs, [key]: n } })),
                !canEdit,
                1
              )}
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hole plug rollup add</label>
            {numInput(
              recipe.master_rollups.hole_plug_add,
              (n) =>
                patch((p) => ({
                  ...p,
                  master_rollups: { ...p.master_rollups, hole_plug_add: n },
                })),
              !canEdit,
              1
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Large screw rollup add</label>
            {numInput(
              recipe.master_rollups.large_screw_add,
              (n) =>
                patch((p) => ({
                  ...p,
                  master_rollups: { ...p.master_rollups, large_screw_add: n },
                })),
              !canEdit,
              1
            )}
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className={h2}>Gate fixed add-ons</h2>
          <p className="mt-1 text-xs text-slate-500">Per gate type — added on top of width-based formulas.</p>
        </div>
        <div className="space-y-6 p-5">
          {(['short', 'single', 'double'] as const).map((gateKind) => (
            <div key={gateKind}>
              <h3 className="mb-3 text-sm font-semibold capitalize text-slate-800">
                {gateKind === 'short' ? 'Walk gate' : gateKind === 'single' ? 'Single gate' : 'Double gate'}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {GATE_ADDON_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                    {numInput(
                      recipe.gate[gateKind][key],
                      (n) =>
                        patch((p) => ({
                          ...p,
                          gate: {
                            ...p.gate,
                            [gateKind]: { ...p.gate[gateKind], [key]: n },
                          },
                        })),
                      !canEdit
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {canEdit ? (
          <>
            <button type="button" className={btn} disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : 'Save product setup'}
            </button>
            <button type="button" className={btnAlt} disabled={saving} onClick={resetDefaults}>
              Reset to FMS defaults
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500">Only company admins can edit product setup.</p>
        )}
      </div>
    </div>
  );
}
