'use client';

import { useState, useEffect, useMemo } from 'react';
import { doubleGatePriceFromSingle } from '@/lib/gate-pricing';

export interface StylePricingRule {
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

export interface StyleInstallLengthTier extends StylePricingRule {
  id: string;
  fence_style_id: string;
  contractor_id?: string;
  min_ft: number;
  max_ft: number | null;
  display_order: number;
}

export type TierDraft = {
  min_ft: string;
  max_ft: string;
  pricePerFt: string;
  singleGate: string;
  doubleGate: string;
  removal: string;
  minJob: string;
};

function tierToDraft(t: StyleInstallLengthTier): TierDraft {
  return {
    min_ft: String(t.min_ft),
    max_ft: t.max_ft == null ? '' : String(t.max_ft),
    pricePerFt: String(t.base_price_per_ft_low),
    singleGate: String(t.single_gate_low),
    doubleGate: String(doubleGatePriceFromSingle(Number(t.single_gate_low) || 0)),
    removal: String(t.removal_price_per_ft_low),
    minJob: String(t.minimum_job_low),
  };
}

function emptyDraft(fromRule: StylePricingRule): TierDraft {
  return {
    min_ft: '0',
    max_ft: '',
    pricePerFt: String(fromRule.base_price_per_ft_low),
    singleGate: String(fromRule.single_gate_low),
    doubleGate: String(doubleGatePriceFromSingle(Number(fromRule.single_gate_low) || 0)),
    removal: String(fromRule.removal_price_per_ft_low),
    minJob: String(fromRule.minimum_job_low),
  };
}

interface Props {
  open: boolean;
  styleName: string;
  rule: StylePricingRule;
  installTiers: StyleInstallLengthTier[];
  onSave: (u: Partial<StylePricingRule>) => void;
  onSaveInstallTiers: (tiers: TierDraft[]) => Promise<void>;
  onClose: () => void;
}

export function StylePricingModal({
  open,
  styleName,
  rule,
  installTiers,
  onSave,
  onSaveInstallTiers,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'single' | 'length'>('single');
  const [pricePerFt, setPricePerFt] = useState(String(rule.base_price_per_ft_low));
  const [singleGate, setSingleGate] = useState(String(rule.single_gate_low));
  const [removal, setRemoval] = useState(String(rule.removal_price_per_ft_low));
  const [minJob, setMinJob] = useState(String(rule.minimum_job_low));
  const [tierRows, setTierRows] = useState<TierDraft[]>([]);
  const [savingTiers, setSavingTiers] = useState(false);

  const initialTab = useMemo(() => (installTiers.length > 0 ? 'length' : 'single'), [installTiers.length]);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setPricePerFt(String(rule.base_price_per_ft_low));
      setSingleGate(String(rule.single_gate_low));
      setRemoval(String(rule.removal_price_per_ft_low));
      setMinJob(String(rule.minimum_job_low));
      setTierRows(
        installTiers.length > 0
          ? [...installTiers].sort((a, b) => a.display_order - b.display_order).map(tierToDraft)
          : [emptyDraft(rule)]
      );
    }
  }, [open, rule, installTiers, initialTab]);

  if (!open) return null;

  function submitSingle(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(pricePerFt) || 0;
    const s = Number(singleGate) || 0;
    const d = doubleGatePriceFromSingle(s);
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
  }

  async function submitLengthBands(e: React.FormEvent) {
    e.preventDefault();
    setSavingTiers(true);
    try {
      await onSaveInstallTiers(tierRows);
    } finally {
      setSavingTiers(false);
    }
  }

  function addTierRow() {
    setTierRows((prev) => [...prev, emptyDraft(rule)]);
  }

  function updateTierRow(i: number, patch: Partial<TierDraft>) {
    setTierRows((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeTierRow(i: number) {
    setTierRows((prev) => prev.filter((_, j) => j !== i));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pricing</h2>
            <p className="mt-0.5 text-sm text-slate-600">{styleName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 sm:px-6">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab('single')}
              className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
                tab === 'single' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Single price
            </button>
            <button
              type="button"
              onClick={() => setTab('length')}
              className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
                tab === 'length' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              By install length
            </button>
          </div>
        </div>

        {tab === 'single' && (
          <form onSubmit={submitSingle} className="space-y-4 px-5 py-5 sm:px-6">
            <p className="text-sm text-slate-600">
              One price for this style. Colours inherit these numbers unless you use per-colour pricing elsewhere.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Price per ft (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricePerFt}
                  onChange={(e) => setPricePerFt(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Min job (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={minJob}
                  onChange={(e) => setMinJob(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Single gate (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={singleGate}
                  onChange={(e) => setSingleGate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Double gate (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  title="Single gate × 2 − $100"
                  value={String(doubleGatePriceFromSingle(Number(singleGate) || 0))}
                  className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 shadow-sm"
                />
                <p className="mt-1 text-xs text-slate-500">Single × 2 − $100</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Removal per ft (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={removal}
                  onChange={(e) => setRemoval(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Save pricing
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {tab === 'length' && (
          <form onSubmit={submitLengthBands} className="space-y-4 px-5 py-5 sm:px-6">
            <p className="text-sm text-slate-600">
              Set price per foot (and gates, etc.) based on <strong className="font-semibold text-slate-800">total install length</strong> for this
              style (sum of fence footage). Example: 10–20 ft at one rate, 21–30 ft at another. Leave max empty for &quot;and up&quot;. Two-gate price is
              always single × 2 − $100.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Min (ft)
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Max (ft)
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      $/ft
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      1-gate
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      2-gate
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Rem/ft
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Min job
                    </th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tierRows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.min_ft}
                          onChange={(e) => updateTierRow(i, { min_ft: e.target.value })}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.max_ft}
                          onChange={(e) => updateTierRow(i, { max_ft: e.target.value })}
                          placeholder="∞"
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.pricePerFt}
                          onChange={(e) => updateTierRow(i, { pricePerFt: e.target.value })}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.singleGate}
                          onChange={(e) => updateTierRow(i, { singleGate: e.target.value })}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          readOnly
                          title="Single × 2 − $100"
                          value={String(doubleGatePriceFromSingle(Number(row.singleGate) || 0))}
                          className="w-20 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.removal}
                          onChange={(e) => updateTierRow(i, { removal: e.target.value })}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.minJob}
                          onChange={(e) => updateTierRow(i, { minJob: e.target.value })}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
                        />
                      </td>
                      <td className="px-1 py-2">
                        <button
                          type="button"
                          onClick={() => removeTierRow(i)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          disabled={tierRows.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">Bands apply to total quoted footage for this style. Overlapping ranges use the tightest matching band.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addTierRow}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Add band
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                disabled={savingTiers}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
              >
                {savingTiers ? 'Saving…' : 'Save length bands'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
