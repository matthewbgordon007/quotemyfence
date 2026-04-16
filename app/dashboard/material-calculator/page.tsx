'use client';

import { useState } from 'react';
import Link from 'next/link';

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';

const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/40 px-5 py-4 sm:px-6';

// PVC Premium 7' panel length ~8.21 ft
const PVC_PANEL_LENGTH_FT = 8.21;
const ITEMS_PER_PANEL = {
  galvanizedPost: 1,
  hPost: 1,
  cap: 1,
  rail: 2,
  railStiffener: 2,
  board: 16,
  boardStiffener: 3,
  shortScrew: 1,
  longScrew: 4,
  plug: 4,
} as const;

type MaterialType = 'pvc';

type FenceLine = {
  id: string;
  label: string;
  lengthFt: number;
  hPost: 0 | 1 | 2; // 0=both ends connect, 1=one free end, 2=both free
  uChannel: 0 | 1 | 2; // 0=no corners, 1=one corner, 2=two corners
  connectsToPrevious: boolean; // if true, start shares H/U with prev line
};

type MaterialItem = { name: string; qty: number };

function roundUp(n: number): number {
  return Math.ceil(n);
}

function roundNorm(n: number, decimals = 1): number {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function computeLineMaterials(line: FenceLine, prevLine: FenceLine | null): MaterialItem[] {
  const panels = line.lengthFt / PVC_PANEL_LENGTH_FT;
  const wholePanels = roundUp(panels);
  const posts = wholePanels + 1;

  // If connects to previous, that end's H post and U channel already counted
  const hPostCount = line.connectsToPrevious ? Math.max(0, line.hPost - 1) : line.hPost;
  const uChannelCount = line.connectsToPrevious ? Math.max(0, line.uChannel - 1) : line.uChannel;

  const concrete = roundNorm(posts * 2.5, 1);
  const galvanized = posts;
  const hPost = hPostCount;
  const cap = hPost;
  const rail = roundUp(panels * ITEMS_PER_PANEL.rail);
  const railStiffener = roundUp(panels * ITEMS_PER_PANEL.railStiffener);
  const board = roundNorm(panels * ITEMS_PER_PANEL.board, 1);
  const boardStiffener = roundNorm(panels * ITEMS_PER_PANEL.boardStiffener, 1);
  const shortScrew = posts;
  const longScrew = roundUp(panels * ITEMS_PER_PANEL.longScrew);
  const plug = roundUp(panels * ITEMS_PER_PANEL.plug);
  const uChannel = uChannelCount;

  return [
    { name: 'Concrete', qty: concrete },
    { name: 'Galvanized Post', qty: galvanized },
    { name: 'H Post', qty: hPost },
    { name: 'Cap (H Post)', qty: cap },
    { name: 'Rail', qty: rail },
    { name: 'Rail Stiffener', qty: railStiffener },
    { name: 'Board', qty: board },
    { name: 'Board Stiffener', qty: boardStiffener },
    { name: 'Short Screw', qty: shortScrew },
    { name: 'Long Screw', qty: longScrew },
    { name: 'Plug', qty: plug },
    { name: 'U Channel', qty: uChannel },
  ];
}

function aggregateMaterials(lines: { items: MaterialItem[] }[]): MaterialItem[] {
  const totals = new Map<string, number>();
  for (const { items } of lines) {
    for (const { name, qty } of items) {
      totals.set(name, (totals.get(name) ?? 0) + qty);
    }
  }
  const order = [
    'Concrete',
    'Galvanized Post', 'H Post', 'Cap (H Post)', 'Rail', 'Rail Stiffener',
    'Board', 'Board Stiffener', 'Short Screw', 'Long Screw', 'Plug', 'U Channel',
  ];
  return order.map((name) => ({ name, qty: totals.get(name) ?? 0 })).filter((x) => x.qty > 0);
}

export default function MaterialCalculatorPage() {
  const [materialType, setMaterialType] = useState<MaterialType>('pvc');
  const [address, setAddress] = useState('');
  const [colourHeight, setColourHeight] = useState('');
  const [lines, setLines] = useState<FenceLine[]>([]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        lengthFt: 0,
        hPost: 2,
        uChannel: 0,
        connectsToPrevious: prev.length > 0,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<FenceLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const computedLines = lines.map((line, i) => ({
    line,
    items: computeLineMaterials(line, i > 0 ? lines[i - 1] : null),
  }));
  const totalMaterials = aggregateMaterials(computedLines);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-4">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Material calculator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Calculate materials per fence line. Add each line, then set H post and U channel per your layout.
        </p>
      </div>

      <div className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Job details</h2>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Material type</label>
              <select value={materialType} onChange={(e) => setMaterialType(e.target.value as MaterialType)} className={`mt-1.5 ${field}`}>
                <option value="pvc">PVC (Premium)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Address / label</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 53 Rothesay"
                className={`mt-1.5 ${field}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Colour / height</label>
              <input
                type="text"
                value={colourHeight}
                onChange={(e) => setColourHeight(e.target.value)}
                placeholder="e.g. Mahogany 7'"
                className={`mt-1.5 ${field}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cardShell}>
        <div className={`${cardHeader} flex flex-wrap items-center justify-between gap-3`}>
          <h2 className="font-semibold text-slate-900">Fence lines</h2>
          <button
            type="button"
            onClick={addLine}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            + Add line
          </button>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-slate-500">
            H post: end points. U channel: corners. If this line connects to the previous at the start, check &quot;Connects to previous&quot; to avoid double-counting.
          </p>

          {lines.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">Add a line to get started.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {lines.map((line, i) => (
                <div key={line.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 ring-1 ring-slate-900/[0.02]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Line label</label>
                        <input
                          type="text"
                          value={line.label}
                          onChange={(e) => updateLine(line.id, { label: e.target.value })}
                          placeholder={`Line ${i + 1}`}
                          className={`mt-1 ${field}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Length (ft)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={line.lengthFt || ''}
                          onChange={(e) => updateLine(line.id, { lengthFt: parseFloat(e.target.value) || 0 })}
                          className={`mt-1 ${field}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">H post (0, 1, 2)</label>
                        <select
                          value={line.hPost}
                          onChange={(e) => updateLine(line.id, { hPost: Number(e.target.value) as 0 | 1 | 2 })}
                          className={`mt-1 ${field}`}
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">U channel (0, 1, 2)</label>
                        <select
                          value={line.uChannel}
                          onChange={(e) => updateLine(line.id, { uChannel: Number(e.target.value) as 0 | 1 | 2 })}
                          className={`mt-1 ${field}`}
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200/60 pt-3 lg:border-t-0 lg:pt-0">
                      {i > 0 && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={line.connectsToPrevious}
                            onChange={(e) => updateLine(line.id, { connectsToPrevious: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                          />
                          Connects to previous
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        aria-label="Remove line"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {totalMaterials.length > 0 && (
        <div className={cardShell}>
          <div className={cardHeader}>
            <h2 className="font-semibold text-slate-900">Total material list</h2>
            <p className="mt-1 text-xs text-slate-500">
              {address && `${address} • `}
              {colourHeight || '—'}
            </p>
          </div>
          <div className="overflow-x-auto p-5 sm:p-6 sm:pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 font-semibold text-slate-700">Item</th>
                  <th className="py-3 text-right font-semibold text-slate-700">Qty</th>
                </tr>
              </thead>
              <tbody>
                {totalMaterials.map(({ name, qty }) => (
                  <tr key={name} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 text-slate-800">{name}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">{qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-slate-600">
        <Link href="/dashboard" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
