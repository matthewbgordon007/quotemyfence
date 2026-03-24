'use client';

const CASES = [
  { company: 'Cura Construction', leads: '+38%', close: '+22%', cycle: '-31%' },
  { company: 'Gordon Landscaping', leads: '+44%', close: '+18%', cycle: '-27%' },
  { company: 'CF Material Supply', leads: '+29%', close: '+16%', cycle: '-24%' },
];

export function CaseStudyStrip() {
  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white py-8 shadow-sm sm:mt-20 sm:py-10">
      <div className="px-5 sm:px-6 lg:px-8">
        <h3 className="text-center font-heading text-2xl font-bold text-slate-900">Real outcomes from early adopters</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CASES.map((c) => (
            <div key={c.company} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{c.company}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-slate-500">Leads</p><p className="font-bold text-emerald-600">{c.leads}</p></div>
                <div><p className="text-xs text-slate-500">Close rate</p><p className="font-bold text-emerald-600">{c.close}</p></div>
                <div><p className="text-xs text-slate-500">Sales cycle</p><p className="font-bold text-emerald-600">{c.cycle}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

