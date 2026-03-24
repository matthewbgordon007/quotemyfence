'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const MONTHLY_PRICE = 199.99;

export function ROICalculator() {
  const [monthlyLeads, setMonthlyLeads] = useState(40);
  const [closeRate, setCloseRate] = useState(22);
  const [avgJobValue, setAvgJobValue] = useState(4800);
  const [lift, setLift] = useState(20);

  const { addedRevenue, projectedJobs, roi } = useMemo(() => {
    const baselineJobs = (monthlyLeads * closeRate) / 100;
    const improvedJobs = baselineJobs * (1 + lift / 100);
    const extraJobs = Math.max(0, improvedJobs - baselineJobs);
    const extraRevenue = extraJobs * avgJobValue;
    const roiPct = MONTHLY_PRICE > 0 ? (extraRevenue / MONTHLY_PRICE) * 100 : 0;
    return {
      addedRevenue: extraRevenue,
      projectedJobs: improvedJobs,
      roi: roiPct,
    };
  }, [monthlyLeads, closeRate, avgJobValue, lift]);

  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
      <div className="px-5 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          ROI calculator: what this could add monthly
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Move the sliders to estimate your potential lift in qualified jobs and revenue.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Monthly leads: {monthlyLeads}</label>
              <input type="range" min={10} max={250} value={monthlyLeads} onChange={(e) => setMonthlyLeads(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Current close rate: {closeRate}%</label>
              <input type="range" min={5} max={60} value={closeRate} onChange={(e) => setCloseRate(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Average job value: {money.format(avgJobValue)}</label>
              <input type="range" min={1200} max={15000} step={100} value={avgJobValue} onChange={(e) => setAvgJobValue(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Expected close-rate lift: {lift}%</label>
              <input type="range" min={5} max={80} value={lift} onChange={(e) => setLift(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Estimated monthly upside</p>
            <p className="mt-3 text-4xl font-extrabold text-slate-900">{money.format(addedRevenue)}</p>
            <p className="mt-2 text-slate-700">Projected won jobs: <strong>{projectedJobs.toFixed(1)}</strong> / month</p>
            <p className="mt-1 text-slate-700">Est. ROI on platform fee: <strong>{roi.toFixed(0)}%</strong></p>
            <p className="mt-4 text-sm text-slate-600">
              Conservative model based on your numbers. Actual results depend on market, pricing, and follow-up speed.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="https://www.quotemyfence.ca/estimate/demo-fence-inc/contact" className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition-all hover:bg-blue-500">Try live demo</a>
              <Link href="/signup" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition-all hover:bg-slate-50">Get started</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

