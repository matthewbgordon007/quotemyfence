'use client';

import { useState, useEffect } from 'react';

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

interface Props {
  open: boolean;
  styleName: string;
  rule: StylePricingRule;
  onSave: (u: Partial<StylePricingRule>) => void;
  onClose: () => void;
}

export function StylePricingModal({ open, styleName, rule, onSave, onClose }: Props) {
  const [pricePerFt, setPricePerFt] = useState(String(rule.base_price_per_ft_low));
  const [singleGate, setSingleGate] = useState(String(rule.single_gate_low));
  const [doubleGate, setDoubleGate] = useState(String(rule.double_gate_low));
  const [removal, setRemoval] = useState(String(rule.removal_price_per_ft_low));
  const [minJob, setMinJob] = useState(String(rule.minimum_job_low));

  useEffect(() => {
    if (open) {
      setPricePerFt(String(rule.base_price_per_ft_low));
      setSingleGate(String(rule.single_gate_low));
      setDoubleGate(String(rule.double_gate_low));
      setRemoval(String(rule.removal_price_per_ft_low));
      setMinJob(String(rule.minimum_job_low));
    }
  }, [open, rule]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
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
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
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
        <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
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
                value={doubleGate}
                onChange={(e) => setDoubleGate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
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
          <p className="text-xs text-slate-500">Colours inherit this style&apos;s pricing.</p>
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
      </div>
    </div>
  );
}
