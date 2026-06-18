import MaterialCalculator from './MaterialCalculator';

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Standalone edition</p>
            <p className="text-sm font-medium text-slate-700">FMS fence material calculator</p>
          </div>
          <p className="text-xs text-slate-500">Work saves in this browser automatically</p>
        </div>
      </header>
      <main className="px-4 py-6">
        <MaterialCalculator />
      </main>
    </div>
  );
}
