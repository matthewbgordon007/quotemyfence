'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  aggregateFmsPvcFenceLines,
  type FmsPvcFenceLineInput,
  type FmsPvcPanelModule,
} from '@/lib/fms-pvc-material-calculator';

const card =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const h2 = 'text-base font-semibold text-slate-900';
const field =
  'rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';
const btn =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50';
const btnGhost = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50';
const tabBase =
  'rounded-lg px-4 py-2 text-sm font-semibold transition-colors border border-transparent';
const tabActive = 'bg-slate-900 text-white border-slate-900';
const tabIdle = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200';

type StyleTab = 'pvc' | 'chain' | 'hybrid';

type LineEndPreset = 'h_continuous' | 'u_at_end' | 'custom';

function newLineId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ln_${Date.now()}`;
}

interface PvcLineRow {
  id: string;
  label: string;
  length_ft: string;
  panel_module: FmsPvcPanelModule;
  end_preset: LineEndPreset;
  h_post_type: 0 | 1 | 2;
  u_channel: string;
}

function presetToExcel(preset: LineEndPreset, h: 0 | 1 | 2, uStr: string): { d6: 0 | 1 | 2; d7: number } {
  if (preset === 'h_continuous') return { d6: 1, d7: 0 };
  if (preset === 'u_at_end') return { d6: 1, d7: 1 };
  const d7 = Math.max(0, Number(uStr) || 0);
  return { d6: h, d7: d7 };
}

function buildInputs(rows: PvcLineRow[]): FmsPvcFenceLineInput[] {
  return rows
    .map((r) => {
      const L = Math.max(0, Number(String(r.length_ft).replace(/,/g, '')) || 0);
      if (L <= 0) return null;
      const { d6, d7 } = presetToExcel(r.end_preset, r.h_post_type, r.u_channel);
      return {
        length_ft: L,
        fence_terminated_h_post_type: d6,
        fence_terminated_u_channel: d7,
        panel_module: r.panel_module,
      };
    })
    .filter(Boolean) as FmsPvcFenceLineInput[];
}

export default function MaterialCalculatorHubPage() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const fromLayoutId = searchParams.get('from_layout');

  const [tab, setTab] = useState<StyleTab>('pvc');
  const [jobAddress, setJobAddress] = useState('');
  const [lines, setLines] = useState<PvcLineRow[]>([
    {
      id: newLineId(),
      label: 'Line 1',
      length_ft: '',
      panel_module: 'nominal_7ft',
      end_preset: 'h_continuous',
      h_post_type: 1,
      u_channel: '0',
    },
  ]);

  useEffect(() => {
    if (tabParam === 'chain' || tabParam === 'hybrid' || tabParam === 'pvc') {
      setTab(tabParam as StyleTab);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!fromLayoutId) return;
    let cancelled = false;
    fetch(`/api/contractor/layouts/${encodeURIComponent(fromLayoutId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.drawing_data) return;
        const segs = (data.drawing_data as { segments?: { length_ft: number }[] }).segments;
        if (!Array.isArray(segs) || !segs.length) return;
        const lens = segs.map((s) => String(Number(s.length_ft) || ''));
        setLines(
          lens.map((len, i) => ({
            id: newLineId(),
            label: `Line ${i + 1}`,
            length_ft: len,
            panel_module: 'nominal_7ft' as FmsPvcPanelModule,
            end_preset: 'h_continuous' as LineEndPreset,
            h_post_type: 1,
            u_channel: '0',
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fromLayoutId]);

  const pvcInputs = useMemo(() => buildInputs(lines), [lines]);
  const pvcJob = useMemo(() => aggregateFmsPvcFenceLines(pvcInputs), [pvcInputs]);

  const pvcLineDetails = useMemo(() => {
    const out: { id: string; label: string; result: (typeof pvcJob.lines)[0] }[] = [];
    let j = 0;
    for (const lr of lines) {
      const L = Math.max(0, Number(String(lr.length_ft).replace(/,/g, '')) || 0);
      if (L <= 0) continue;
      const r = pvcJob.lines[j];
      if (r) out.push({ id: lr.id, label: lr.label, result: r });
      j += 1;
    }
    return out;
  }, [lines, pvcJob.lines]);

  const bomTsv = useMemo(() => {
    const head = ['Job', jobAddress || '—', '', ''].join('\t');
    const hdr = ['SKU', 'Qty'].join('\t');
    const rows = pvcJob.sku_rows.map((r) => `${r.label}\t${r.quantity}`);
    const extra = [`Whole panels (sum D9)`, `${pvcJob.sum_whole_panels}`, '', ''].join('\t');
    const conc = [`Concrete bags est. (H-post × 2.5)`, `${pvcJob.concrete_bags_est}`, '', ''].join('\t');
    return [head, hdr, ...rows, extra, conc].join('\n');
  }, [pvcJob, jobAddress]);

  const copyBom = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bomTsv);
      alert('Copied material summary as TSV.');
    } catch {
      prompt('Copy:', bomTsv);
    }
  }, [bomTsv]);

  function addLine() {
    setLines((p) => [
      ...p,
      {
        id: newLineId(),
        label: `Line ${p.length + 1}`,
        length_ft: '',
        panel_module: 'nominal_7ft',
        end_preset: 'h_continuous',
        h_post_type: 1,
        u_channel: '0',
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<PvcLineRow>) {
    setLines((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeLine(id: string) {
    setLines((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 pb-24">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Material calculator (FMS)</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Streamlined takeoff from the 2026 FMS workbook: enter the job address, each straight run length, panel height
          module, and how the line ends (continuous H-post or U-channel). Totals match the Excel{' '}
          <strong className="font-medium text-slate-800">Material Calculator — PVC</strong> fence block (per line),
          summed like pasting each line into the colour sheet columns.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Gate sections from the workbook are not in this page yet — only fence lines. For a configurable per-panel BOM
          (rails rule, custom items), use{' '}
          <Link href="/dashboard/material-calculator/pvc" className="font-medium text-blue-600 hover:underline">
            Legacy PVC BOM
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${tabBase} ${tab === 'pvc' ? tabActive : tabIdle}`} onClick={() => setTab('pvc')}>
          PVC
        </button>
        <button
          type="button"
          className={`${tabBase} ${tab === 'chain' ? tabActive : tabIdle}`}
          onClick={() => setTab('chain')}
        >
          Chain link
        </button>
        <button
          type="button"
          className={`${tabBase} ${tab === 'hybrid' ? tabActive : tabIdle}`}
          onClick={() => setTab('hybrid')}
        >
          Hybrid
        </button>
      </div>

      {tab === 'pvc' && (
        <>
          <section className={card}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-emerald-50/30 px-5 py-4">
              <h2 className={h2}>Job</h2>
              <p className="mt-1 text-xs text-slate-500">Stored on-screen only — not saved to the database yet.</p>
            </div>
            <div className="p-5">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address / label</label>
              <input
                type="text"
                value={jobAddress}
                onChange={(e) => setJobAddress(e.target.value)}
                placeholder="e.g. 53 Rothesay"
                className={`${field} w-full max-w-xl`}
              />
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
              <h2 className={h2}>Fence lines</h2>
              <p className="mt-1 text-xs text-slate-500">
                <strong className="text-slate-700">H-post end</strong> = Excel D6=1, D7=0 (continuous line on slit
                post). <strong className="text-slate-700">U-channel end</strong> = D6=1, D7=1 (terminal U). Use{' '}
                <em className="not-italic text-slate-600">Custom</em> for other workbook 0/1/2 + U values.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {lines.map((row, idx) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 ring-1 ring-slate-900/[0.03]"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">Run {idx + 1}</span>
                    <button type="button" className={btnGhost} onClick={() => removeLine(row.id)} disabled={lines.length <= 1}>
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Line label (optional)
                      </label>
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateLine(row.id, { label: e.target.value })}
                        className={`${field} w-full`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Length (ft)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.length_ft}
                        onChange={(e) => updateLine(row.id, { length_ft: e.target.value })}
                        className={`${field} w-full`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Panel module
                      </label>
                      <select
                        value={row.panel_module}
                        onChange={(e) =>
                          updateLine(row.id, { panel_module: e.target.value as FmsPvcPanelModule })
                        }
                        className={`${field} w-full`}
                      >
                        <option value="nominal_7ft">7&apos; nominal (÷ 8.20833333 ft)</option>
                        <option value="nominal_6ft">6&apos; nominal (÷ 6.75 ft)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Line end
                      </label>
                      <select
                        value={row.end_preset}
                        onChange={(e) => updateLine(row.id, { end_preset: e.target.value as LineEndPreset })}
                        className={`${field} w-full`}
                      >
                        <option value="h_continuous">Ends on H-post (continuous / standard)</option>
                        <option value="u_at_end">Ends with U-channel</option>
                        <option value="custom">Custom (Excel D6 / D7)</option>
                      </select>
                    </div>
                    {row.end_preset === 'custom' && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            H-post type (0–2)
                          </label>
                          <select
                            value={row.h_post_type}
                            onChange={(e) =>
                              updateLine(row.id, { h_post_type: Number(e.target.value) as 0 | 1 | 2 })
                            }
                            className={`${field} w-full`}
                          >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            U-channel (D7)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={row.u_channel}
                            onChange={(e) => updateLine(row.id, { u_channel: e.target.value })}
                            className={`${field} w-full`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addLine} className={btnGhost}>
                + Add line
              </button>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Totals (all lines)</h2>
              <p className="mt-1 text-xs text-slate-500">
                Same SKU names as the workbook fence block. Concrete estimate uses Master-list rule: total H-posts ×
                2.5 (bags).
              </p>
            </div>
            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {pvcJob.sku_rows.map((r) => (
                    <tr key={r.label} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{r.label}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-800">{r.quantity}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <td className="px-2 py-2 font-medium text-slate-800">Whole panels (Σ Excel D9)</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {pvcJob.sum_whole_panels}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <td className="px-2 py-2 font-medium text-slate-800">Concrete bags (est., H-post × 2.5)</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {pvcJob.concrete_bags_est}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={copyBom} className={btn}>
                  Copy TSV
                </button>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Per-line detail</h2>
            </div>
            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Label</th>
                    <th className="px-2 py-2 text-right">ft</th>
                    <th className="px-2 py-2">Module</th>
                    <th className="px-2 py-2 text-right">D9</th>
                    <th className="px-2 py-2 text-right">H-post</th>
                    <th className="px-2 py-2 text-right">U</th>
                    <th className="px-2 py-2 text-right">Rail</th>
                    <th className="px-2 py-2 text-right">Board</th>
                  </tr>
                </thead>
                <tbody>
                  {pvcLineDetails.map(({ id, label, result: ln }) => (
                    <tr key={id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-800">{label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{ln.input.length_ft}</td>
                      <td className="px-2 py-2 text-slate-600">
                        {ln.input.panel_module === 'nominal_7ft' ? "7'" : "6'"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{ln.total_whole_panels}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{ln.h_post}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{ln.u_channel}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{ln.rail}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{ln.board}</td>
                    </tr>
                  ))}
                  {pvcLineDetails.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-2 py-6 text-center text-slate-500">
                        Enter at least one line length to calculate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'chain' && (
        <section className={card}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className={h2}>Chain link</h2>
            <p className="mt-2 text-sm text-slate-600">
              The FMS workbook tab <strong className="font-medium text-slate-800">Material Calculator — Chain link</strong>{' '}
              and <strong className="font-medium text-slate-800">Chain Link — Material List Breakdown</strong> drive the
              same multi-step flow. We can port those formulas next so this tab matches Excel the same way PVC does.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/dashboard/material-calculator?tab=pvc"
                className="font-semibold text-blue-600 hover:underline"
              >
                Use PVC calculator
              </Link>{' '}
              for now, or keep using the spreadsheet for chain link until this tab ships.
            </p>
          </div>
        </section>
      )}

      {tab === 'hybrid' && (
        <section className={card}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className={h2}>Hybrid (horizontal + vertical)</h2>
            <p className="mt-2 text-sm text-slate-600">
              The workbook combines <strong className="font-medium text-slate-800">Horizontal Material Calculator</strong>,{' '}
              <strong className="font-medium text-slate-800">Vertical Material Calculator</strong>, and the hybrid master
              list. Porting is a follow-up once chain link is in place.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/dashboard/material-calculator?tab=pvc"
                className="font-semibold text-blue-600 hover:underline"
              >
                Use PVC calculator
              </Link>{' '}
              for PVC-only jobs in the meantime.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
