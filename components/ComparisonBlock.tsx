'use client';

const oldWay = [
  'Phone tag & guesswork',
  'Site visits for ballpark quotes',
  'Days to send an estimate',
  'Leads go cold waiting',
];

const newWay = [
  'Map-based instant estimates',
  'Satellite-precise measurements',
  'Quote in under 60 seconds',
  'Pre-qualified leads 24/7',
];

export function ComparisonBlock() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Old way</span>
        </div>
        <ul className="mt-4 space-y-3">
          {oldWay.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">With QuoteMyFence</span>
        </div>
        <ul className="mt-4 space-y-3">
          {newWay.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700">
              <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
