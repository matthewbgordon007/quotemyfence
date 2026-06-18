'use client';

import { useCallback, useState } from 'react';
import {
  DEFAULT_FMS_CALCULATOR_RECIPE,
  normalizeFmsCalculatorRecipe,
  type FmsCalculatorRecipeV1,
  type FmsGateRecipeAddons,
} from '@/lib/fms-calculator-recipe';

const card =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const h2 = 'text-base font-semibold text-slate-900';
const field =
  'rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500';
const btn =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50';
const btnAlt = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50';

type Props = {
  recipe: FmsCalculatorRecipeV1;
  canEdit: boolean;
  onChange: (recipe: FmsCalculatorRecipeV1) => void;
  onSave: () => Promise<void>;
};

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

function textInput(value: string, onChange: (s: string) => void, disabled: boolean) {
  return (
    <input
      type="text"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${field} w-full`}
    />
  );
}

const PER_PANEL_FIELDS: {
  key: keyof FmsCalculatorRecipeV1['fence']['per_panel'];
  skuKey: keyof FmsCalculatorRecipeV1['fence_sku_labels'];
  label: string;
}[] = [
  { key: 'galvanized', skuKey: 'galvanized_post', label: 'Galvanized post' },
  { key: 'h_post', skuKey: 'h_post', label: 'H-post' },
  { key: 'cap_h_post', skuKey: 'cap_h_post', label: 'Cap (H-post)' },
  { key: 'rail', skuKey: 'rail', label: 'Rail' },
  { key: 'rail_stiffener', skuKey: 'rail_stiffener', label: 'Rail stiffener' },
  { key: 'board', skuKey: 'board', label: 'Board' },
  { key: 'board_stiffener', skuKey: 'board_stiffener', label: 'Board stiffener' },
  { key: 'long_screw', skuKey: 'long_screw', label: 'Large screw' },
  { key: 'short_screw', skuKey: 'short_screw', label: 'Short screw' },
  { key: 'plug', skuKey: 'plug', label: 'Hole plug' },
];

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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-950">
        <strong className="font-semibold">Product setup</strong> — adjust pieces per panel, labels, pack sizes, and gate
        add-ons. Formulas stay the same; only your quantities and names change for contractors using your catalog.
      </div>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
          <h2 className={h2}>Panel spacing &amp; per-panel quantities</h2>
          <p className="mt-1 text-xs text-slate-500">Defaults match the FMS 2026 workbook.</p>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
                (n) =>
                  patch((p) => ({
                    ...p,
                    fence: { ...p.fence, board_multiplier_6ft: n },
                  })),
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

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qty per panel</th>
                  <th className="px-3 py-2">Fence SKU label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PER_PANEL_FIELDS.map(({ key, skuKey, label }) => (
                  <tr key={key}>
                    <td className="px-3 py-2 font-medium text-slate-800">{label}</td>
                    <td className="px-3 py-2">
                      {numInput(
                        recipe.fence.per_panel[key],
                        (n) =>
                          patch((p) => ({
                            ...p,
                            fence: {
                              ...p.fence,
                              per_panel: { ...p.fence.per_panel, [key]: n },
                            },
                          })),
                        !canEdit
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {textInput(
                        recipe.fence_sku_labels[skuKey],
                        (s) =>
                          patch((p) => ({
                            ...p,
                            fence_sku_labels: { ...p.fence_sku_labels, [skuKey]: s },
                          })),
                        !canEdit
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
