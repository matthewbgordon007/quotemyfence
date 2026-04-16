'use client';

import { useMemo, useState } from 'react';
import {
  firstSheetColorLineRecipeDefaults,
  firstSheetFieldSpecs,
  firstSheetGateLineRecipeDefaults,
  starterMaterialCalculatorTemplate,
  type MaterialCalculatorInputField,
  type MaterialCalculatorRecipeItem,
} from '@/lib/material-calculator-framework';

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm';

const cardHeader =
  'border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-indigo-50/40 px-5 py-4 sm:px-6';

type SampleLine = {
  length_ft: number;
  h_post_terminations: number;
  u_channel_terminations: number;
};

type SampleGateLine = {
  line_width_inches: number;
  posts_needed: number;
};

const inputFieldLabels: Record<MaterialCalculatorInputField, string> = {
  line_length_ft: 'Line length',
  exact_panels: 'Exact panels',
  rounded_panels: 'Rounded panels',
  h_post_terminations: 'H post terminations',
  u_channel_terminations: 'U channel terminations',
  gate_unit: 'Gate unit',
  gate_posts_needed: 'Gate posts needed',
  gate_total_boards: 'Gate total boards',
};

function roundForMode(value: number, mode: MaterialCalculatorRecipeItem['rounding_mode']) {
  if (mode === 'none') return value;
  if (mode === 'nearest') return Math.round(value);
  return Math.ceil(value);
}

export function SupplierMaterialCalculatorFramework() {
  const [title, setTitle] = useState(starterMaterialCalculatorTemplate.title);
  const [description, setDescription] = useState(starterMaterialCalculatorTemplate.description);
  const [panelLengthFt, setPanelLengthFt] = useState(starterMaterialCalculatorTemplate.panel_length_ft);
  const [sampleLine, setSampleLine] = useState<SampleLine>({
    length_ft: 70,
    h_post_terminations: 3,
    u_channel_terminations: 2,
  });
  const [recipeItems, setRecipeItems] = useState(firstSheetColorLineRecipeDefaults);
  const [gateRecipeItems, setGateRecipeItems] = useState(firstSheetGateLineRecipeDefaults);
  const [sampleGateLine, setSampleGateLine] = useState<SampleGateLine>({
    line_width_inches: 60,
    posts_needed: 2,
  });

  const exactPanels = useMemo(() => {
    if (!panelLengthFt || panelLengthFt <= 0) return 0;
    return sampleLine.length_ft / panelLengthFt;
  }, [panelLengthFt, sampleLine.length_ft]);

  const roundedPanels = useMemo(() => Math.ceil(exactPanels || 0), [exactPanels]);

  const previewRows = useMemo(() => {
    return recipeItems.map((item) => {
      const sourceValue =
        item.input_field === 'line_length_ft'
          ? sampleLine.length_ft
          : item.input_field === 'exact_panels'
            ? exactPanels
            : item.input_field === 'rounded_panels'
              ? roundedPanels
              : item.input_field === 'h_post_terminations'
                ? sampleLine.h_post_terminations
                : sampleLine.u_channel_terminations;

      const raw = sourceValue * item.quantity_per_panel;
      return {
        ...item,
        raw,
        final: roundForMode(raw, item.rounding_mode),
      };
    });
  }, [exactPanels, recipeItems, roundedPanels, sampleLine]);

  const gateDoorWidth = useMemo(() => {
    return Math.max(0, sampleGateLine.line_width_inches - 10.5);
  }, [sampleGateLine.line_width_inches]);

  const gateTotalBoards = useMemo(() => {
    return gateDoorWidth / 6.125;
  }, [gateDoorWidth]);

  const gatePreviewRows = useMemo(() => {
    return gateRecipeItems.map((item) => {
      const sourceValue =
        item.input_field === 'gate_posts_needed'
          ? sampleGateLine.posts_needed
          : item.input_field === 'gate_total_boards'
            ? gateTotalBoards
            : item.input_field === 'gate_unit'
              ? 1
              : 0;
      const raw = sourceValue * item.quantity_per_panel;
      return {
        ...item,
        raw,
        final: roundForMode(raw, item.rounding_mode),
      };
    });
  }, [gateRecipeItems, gateTotalBoards, sampleGateLine.posts_needed]);

  const colorLineInputs = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'color_line' && f.mode === 'input'), []);
  const colorLineCalculated = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'color_line' && f.mode === 'calculated'), []);
  const gateLineInputs = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'gate_line' && f.mode === 'input'), []);
  const gateLineCalculated = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'gate_line' && f.mode === 'calculated'), []);

  function updateRecipeItem(id: string, patch: Partial<MaterialCalculatorRecipeItem>) {
    setRecipeItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addRecipeItem() {
    setRecipeItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity_per_panel: 1,
        input_field: 'exact_panels',
        rounding_mode: 'ceil',
        notes: '',
      },
    ]);
  }

  function removeRecipeItem(id: string) {
    setRecipeItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateGateRecipeItem(id: string, patch: Partial<MaterialCalculatorRecipeItem>) {
    setGateRecipeItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addGateRecipeItem() {
    setGateRecipeItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity_per_panel: 1,
        input_field: 'gate_unit',
        rounding_mode: 'ceil',
        notes: '',
      },
    ]);
  }

  function removeGateRecipeItem(id: string) {
    setGateRecipeItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.14), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.05))',
        }}
      >
        <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-ink)]" style={{ background: 'var(--dashboard-soft)' }}>
          Supplier Pages
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Material calculator</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Quick workflow: enter the manual inputs first, then review the material totals right below.</p>
      </div>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Premium Fence Color Line - Manual inputs</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Address / line label</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Color and height</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Total fence line length (ft)</label>
            <input type="number" min={0} step={0.01} value={sampleLine.length_ft} onChange={(e) => setSampleLine((prev) => ({ ...prev, length_ft: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Fence terminated with H post (0, 1, 2)</label>
            <input type="number" min={0} step={1} value={sampleLine.h_post_terminations} onChange={(e) => setSampleLine((prev) => ({ ...prev, h_post_terminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Fence terminated with U channel (0, 1, 2)</label>
            <input type="number" min={0} step={1} value={sampleLine.u_channel_terminations} onChange={(e) => setSampleLine((prev) => ({ ...prev, u_channel_terminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Panel length basis (ft)</label>
            <input type="number" min={0.01} step={0.01} value={panelLengthFt} onChange={(e) => setPanelLengthFt(Number(e.target.value) || 0)} className={`mt-1.5 ${field}`} />
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Premium Fence Color Line - Material totals</h2>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total fence line panels</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{exactPanels.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Total whole panels</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{roundedPanels}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 font-semibold text-slate-700">Item</th>
                  <th className="py-3 text-right font-semibold text-slate-700">Final</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 font-medium text-slate-900">{row.name || 'Untitled item'}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{row.final}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Gate Line - Manual inputs</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Total gate line width (inches)</label>
            <input type="number" min={0} step={0.01} value={sampleGateLine.line_width_inches} onChange={(e) => setSampleGateLine((prev) => ({ ...prev, line_width_inches: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Post needed (0, 1, or 2)</label>
            <input type="number" min={0} step={1} value={sampleGateLine.posts_needed} onChange={(e) => setSampleGateLine((prev) => ({ ...prev, posts_needed: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Gate Line - Material totals</h2>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total gate door width</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{gateDoorWidth.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Total gate boards</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{gateTotalBoards.toFixed(2)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 font-semibold text-slate-700">Item</th>
                  <th className="py-3 text-right font-semibold text-slate-700">Final</th>
                </tr>
              </thead>
              <tbody>
                {gatePreviewRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 font-medium text-slate-900">{row.name || 'Untitled item'}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{row.final}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800 sm:px-6">
          Show math + framework details
        </summary>
        <div className="border-t border-slate-100 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Color line - contractor inputs</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{colorLineInputs.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Color line - auto calculated</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{colorLineCalculated.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Gate line - contractor inputs</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{gateLineInputs.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Gate line - auto calculated</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{gateLineCalculated.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">Core math: `exact panels = length / panel length`, `whole panels = ceil(exact panels)`.</p>
        </div>
      </details>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800 sm:px-6">
          Show recipe builders
        </summary>
        <div className="space-y-6 border-t border-slate-100 p-5 sm:p-6">
          <section className={cardShell}>
            <div className={cardHeader}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Per-panel recipe builder</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    This is where suppliers define what goes into a panel and what each item should multiply against.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRecipeItem}
                  className="rounded-xl bg-[var(--dashboard-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  Add item
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {recipeItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Item</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateRecipeItem(item.id, { name: e.target.value })}
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</label>
                      <input
                        type="number"
                        step={0.01}
                        value={item.quantity_per_panel}
                        onChange={(e) => updateRecipeItem(item.id, { quantity_per_panel: Number(e.target.value) || 0 })}
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Multiply from</label>
                      <select
                        value={item.input_field}
                        onChange={(e) => updateRecipeItem(item.id, { input_field: e.target.value as MaterialCalculatorInputField })}
                        className={`mt-1.5 ${field}`}
                      >
                        {Object.entries(inputFieldLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Rounding</label>
                      <select
                        value={item.rounding_mode}
                        onChange={(e) => updateRecipeItem(item.id, { rounding_mode: e.target.value as MaterialCalculatorRecipeItem['rounding_mode'] })}
                        className={`mt-1.5 ${field}`}
                      >
                        <option value="ceil">Round up</option>
                        <option value="nearest">Nearest whole</option>
                        <option value="none">Keep exact</option>
                      </select>
                    </div>
                    <div className="flex items-end lg:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeRecipeItem(item.id)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="lg:col-span-12">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) => updateRecipeItem(item.id, { notes: e.target.value })}
                        placeholder="Optional reminder about how this item should behave"
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className={cardShell}>
            <div className={cardHeader}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Gate line recipe builder</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Gate material items from the first sheet with editable quantities, sources, and rounding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addGateRecipeItem}
                  className="rounded-xl bg-[var(--dashboard-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  Add gate item
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {gateRecipeItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Item</label>
                      <input value={item.name} onChange={(e) => updateGateRecipeItem(item.id, { name: e.target.value })} className={`mt-1.5 ${field}`} />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</label>
                      <input
                        type="number"
                        step={0.01}
                        value={item.quantity_per_panel}
                        onChange={(e) => updateGateRecipeItem(item.id, { quantity_per_panel: Number(e.target.value) || 0 })}
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Multiply from</label>
                      <select
                        value={item.input_field}
                        onChange={(e) => updateGateRecipeItem(item.id, { input_field: e.target.value as MaterialCalculatorInputField })}
                        className={`mt-1.5 ${field}`}
                      >
                        {Object.entries(inputFieldLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Rounding</label>
                      <select
                        value={item.rounding_mode}
                        onChange={(e) => updateGateRecipeItem(item.id, { rounding_mode: e.target.value as MaterialCalculatorRecipeItem['rounding_mode'] })}
                        className={`mt-1.5 ${field}`}
                      >
                        <option value="ceil">Round up</option>
                        <option value="nearest">Nearest whole</option>
                        <option value="none">Keep exact</option>
                      </select>
                    </div>
                    <div className="flex items-end lg:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeGateRecipeItem(item.id)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="lg:col-span-12">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) => updateGateRecipeItem(item.id, { notes: e.target.value })}
                        placeholder="Optional reminder for gate-specific logic"
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
