'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  aggregateFmsPvcFenceLines,
  type FmsPvcFenceLineInput,
  type FmsPvcPanelModule,
} from '@/lib/fms-pvc-material-calculator';
import {
  adobeBreakdownToRows,
  buildPvcAdobeBreakdown,
  computePvcMasterColumn,
  type FmsPvcMasterExtras,
} from '@/lib/fms-pvc-breakdown-master';
import { sumGateAdobeRows, type FmsPvcGatePosts } from '@/lib/fms-pvc-gates-calculator';
import {
  computeFmsChainLinkFenceLine,
  computeFmsChainLinkGate,
  type FmsChainLinkFenceInput,
} from '@/lib/fms-chain-link-calculator';
import {
  combineHybridMasterPreview,
  computeHybridHorizontalWpc6ftFence,
  computeHybridHorizontalWpc6ftGate,
  computeHybridVerticalPvc64Fence,
  computeHybridVerticalPvc64GateDouble,
  computeHybridVerticalPvc64GateSingle,
} from '@/lib/fms-hybrid-calculators';
import {
  FMS_PVC_CALCULATOR_COLOURS,
  FMS_WPC_CALCULATOR_COLOURS,
  coerceFmsPvcCalculatorColour,
  coerceFmsWpcCalculatorColour,
  fmsPvcMaterialListBreakdownTitle,
  fmsPvcVerticalCalculatorTitle,
  fmsWpcHorizontalCalculatorTitle,
  type FmsPvcCalculatorColour,
  type FmsWpcCalculatorColour,
} from '@/lib/fms-calculator-colour-presets';
import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';
import { layoutPointsToSegmentPairs, layoutSegmentsToPvcFenceInputs } from '@/lib/layout-sketch-to-pvc-inputs';

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
  /** When true, D6/D7 came from the layout sketch (corners vs straight merge). */
  fromSketch?: boolean;
}

type LayoutSketchDrawingPayload = {
  points: { x: number; y: number }[];
  segments: { length_ft: number }[];
  gates: { type: 'single' | 'double'; quantity: number }[];
  gate_placements: { type: 'single' | 'double'; line_index: number }[];
  total_length_ft: number;
};

function drawingDataToPvcLineRows(
  drawing: { points: { x: number; y: number }[]; segments: { length_ft?: number }[] },
  panelModule: FmsPvcPanelModule
): PvcLineRow[] | null {
  const pairs = layoutPointsToSegmentPairs(drawing.points, drawing.segments);
  if (pairs.length === 0) return null;
  const lengthPerSeg = pairs.map((pair, i) => {
    const raw = drawing.segments[i]?.length_ft;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
    const d = Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
    return Math.max(1e-6, d);
  });
  const inputs = layoutSegmentsToPvcFenceInputs(pairs, lengthPerSeg, panelModule);
  return inputs.map((inp, i) => ({
    id: newLineId(),
    label: `Run ${i + 1}`,
    length_ft: String(inp.length_ft),
    panel_module: panelModule,
    end_preset: 'custom',
    h_post_type: inp.fence_terminated_h_post_type as 0 | 1 | 2,
    u_channel: String(inp.fence_terminated_u_channel),
    fromSketch: true,
  }));
}

interface PvcGateRow {
  id: string;
  width_in: string;
  posts: FmsPvcGatePosts;
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

function emptyGateRow(): PvcGateRow {
  return { id: newLineId(), width_in: '', posts: 1 };
}

function parseGateRowsShort(rows: PvcGateRow[]) {
  return rows
    .map((r) => {
      const w = Math.max(0, Number(String(r.width_in).replace(/,/g, '')) || 0);
      if (w <= 0) return null;
      return { gate_width_in: w, posts: r.posts };
    })
    .filter(Boolean) as { gate_width_in: number; posts: FmsPvcGatePosts }[];
}

const MASTER_EXTRA_KEYS: (keyof FmsPvcMasterExtras)[] = [
  'm6',
  'm7',
  'm8',
  'm9',
  'm10',
  'm11',
  'm12',
  'm13',
  'm15',
  'm16',
  'm19',
  'm20',
  'm21',
  'm22',
  'm23',
  'm24',
];

const MASTER_EXTRA_LABELS: Record<keyof FmsPvcMasterExtras, string> = {
  m6: 'M6 (rail)',
  m7: 'M7 (rail stiff.)',
  m8: 'M8 (board)',
  m9: 'M9 (board stiff.)',
  m10: 'M10 (H-post)',
  m11: 'M11 (galv.)',
  m12: 'M12 (U-ch.)',
  m13: 'M13 (H stiff.)',
  m15: 'M15 (overhead)',
  m16: 'M16 (diagonal)',
  m19: 'M19 (post cap)',
  m20: 'M20 (plug)',
  m21: 'M21 (large scr.)',
  m22: 'M22 (short scr.)',
  m23: 'M23 (latch)',
  m24: 'M24 (hinge)',
};

export default function MaterialCalculatorHubPage() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const fromLayoutId = searchParams.get('from_layout');

  const [tab, setTab] = useState<StyleTab>('pvc');
  const [jobAddress, setJobAddress] = useState('');
  /** Matches the Excel per-colour breakdown tab (labels / TSV only; formulas shared). */
  const [pvcBreakdownColour, setPvcBreakdownColour] = useState<FmsPvcCalculatorColour>('Adobe');
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

  const [layoutSketchData, setLayoutSketchData] = useState<LayoutSketchDrawingPayload | null>(null);

  const [shortGates, setShortGates] = useState<PvcGateRow[]>([]);
  const [singleGates, setSingleGates] = useState<PvcGateRow[]>([]);
  const [doubleGates, setDoubleGates] = useState<PvcGateRow[]>([]);
  const [masterExtrasOpen, setMasterExtrasOpen] = useState(false);
  const [masterExtras, setMasterExtras] = useState<Partial<Record<keyof FmsPvcMasterExtras, string>>>({});

  /** Chain link */
  const [chainLines, setChainLines] = useState<
    { id: string; label: string; length_ft: string; terminal_post: string }[]
  >([{ id: newLineId(), label: 'Run 1', length_ft: '', terminal_post: '2' }]);
  const [chainRailFt, setChainRailFt] = useState('10');
  const [chainMeshFt, setChainMeshFt] = useState('50');
  const [chainTiesPerBag, setChainTiesPerBag] = useState('100');
  const [chainGates, setChainGates] = useState<
    { id: string; width_in: string; posts: FmsPvcGatePosts; opening_in: string }[]
  >([]);

  /** Hybrid */
  const [hybHLen, setHybHLen] = useState('');
  const [hybHHPost, setHybHHPost] = useState<0 | 1 | 2>(1);
  const [hybHU, setHybHU] = useState<0 | 1 | 2>(0);
  const [hybHGateOn, setHybHGateOn] = useState(false);
  const [hybHGateW, setHybHGateW] = useState('');
  const [hybHGateP, setHybHGateP] = useState<FmsPvcGatePosts>(1);
  const [hybVLen, setHybVLen] = useState('');
  const [hybVHPost, setHybVHPost] = useState<0 | 1 | 2>(1);
  const [hybVU, setHybVU] = useState<0 | 1 | 2>(0);
  const [hybVSingleOn, setHybVSingleOn] = useState(false);
  const [hybVSingleW, setHybVSingleW] = useState('');
  const [hybVSingleP, setHybVSingleP] = useState<FmsPvcGatePosts>(1);
  const [hybVDoubleOn, setHybVDoubleOn] = useState(false);
  const [hybVDoubleW, setHybVDoubleW] = useState('');
  const [hybVDoubleP, setHybVDoubleP] = useState<FmsPvcGatePosts>(1);
  const [hybridWpcColour, setHybridWpcColour] = useState<FmsWpcCalculatorColour>('Ash');
  const [hybridPvcColour, setHybridPvcColour] = useState<FmsPvcCalculatorColour>('White');

  useEffect(() => {
    if (tabParam === 'chain' || tabParam === 'hybrid' || tabParam === 'pvc') {
      setTab(tabParam as StyleTab);
    }
  }, [tabParam]);

  useEffect(() => {
    const pvc = coerceFmsPvcCalculatorColour(searchParams.get('pvc_colour'));
    if (pvc) setPvcBreakdownColour(pvc);
    const hw = coerceFmsWpcCalculatorColour(searchParams.get('hybrid_wpc'));
    if (hw) setHybridWpcColour(hw);
    const hp = coerceFmsPvcCalculatorColour(searchParams.get('hybrid_pvc'));
    if (hp) setHybridPvcColour(hp);
  }, [searchParams]);

  useEffect(() => {
    if (!fromLayoutId) return;
    let cancelled = false;
    fetch(`/api/contractor/layouts/${encodeURIComponent(fromLayoutId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.drawing_data) return;
        const dd = data.drawing_data as {
          points?: { x: number; y: number }[];
          segments?: { length_ft?: number }[];
        };
        const pts = Array.isArray(dd.points) ? dd.points : [];
        const segMeta = Array.isArray(dd.segments) ? dd.segments : [];
        const inferred = drawingDataToPvcLineRows({ points: pts, segments: segMeta }, 'nominal_7ft');
        if (inferred?.length) {
          setLines(inferred);
          return;
        }
        if (!segMeta.length) return;
        const lens = segMeta.map((s) => String(Number(s.length_ft) || ''));
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

  const shortParsed = useMemo(() => parseGateRowsShort(shortGates), [shortGates]);
  const singleParsed = useMemo(() => parseGateRowsShort(singleGates), [singleGates]);
  const doubleParsed = useMemo(() => parseGateRowsShort(doubleGates), [doubleGates]);

  const gateMerge = useMemo(
    () => sumGateAdobeRows(shortParsed, singleParsed, doubleParsed),
    [shortParsed, singleParsed, doubleParsed]
  );

  const gateWidthInchesSum = useMemo(() => {
    const sum = (arr: typeof shortParsed) => arr.reduce((a, g) => a + g.gate_width_in, 0);
    return sum(shortParsed) + sum(singleParsed) + sum(doubleParsed);
  }, [shortParsed, singleParsed, doubleParsed]);

  const gateCount = shortParsed.length + singleParsed.length + doubleParsed.length;

  const extrasParsed: FmsPvcMasterExtras = useMemo(() => {
    const o: FmsPvcMasterExtras = {};
    for (const k of MASTER_EXTRA_KEYS) {
      const s = masterExtras[k];
      if (s == null || s === '') continue;
      const n = Number(String(s).replace(/,/g, ''));
      if (Number.isFinite(n)) (o as Record<string, number>)[k] = n;
    }
    return o;
  }, [masterExtras]);

  const pvcAdobe = useMemo(
    () => buildPvcAdobeBreakdown(pvcJob.lines, gateMerge.merged, gateWidthInchesSum),
    [pvcJob.lines, gateMerge.merged, gateWidthInchesSum]
  );

  const pvcMaster = useMemo(
    () => computePvcMasterColumn(pvcAdobe, extrasParsed, gateCount),
    [pvcAdobe, extrasParsed, gateCount]
  );

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

  const adobeRows = useMemo(() => adobeBreakdownToRows(pvcAdobe), [pvcAdobe]);

  const bomTsv = useMemo(() => {
    const head = ['Job', jobAddress || '—', '', ''].join('\t');
    const colourLine = ['PVC colour / breakdown tab', pvcBreakdownColour, '', ''].join('\t');
    const fenceHdr = ['Fence-only SKU rollup (Excel block)', '', '', ''].join('\t');
    const hdr = ['SKU', 'Qty'].join('\t');
    const fenceRows = pvcJob.sku_rows.map((r) => `${r.label}\t${r.quantity}`);
    const extra = [`Whole panels (sum D9)`, `${pvcJob.sum_whole_panels}`, '', ''].join('\t');
    const concF = [`Concrete (fence H-post only × 2.5)`, `${pvcJob.concrete_bags_est}`, '', ''].join('\t');
    const adobeH = [`${fmsPvcMaterialListBreakdownTitle(pvcBreakdownColour)} (J row → qty)`, '', '', ''].join('\t');
    const adobeBody = adobeRows.map((r) => `${r.row}\t${r.label}\t${r.qty}`);
    const masterH = [`Master column C — ${pvcBreakdownColour} (optional M adders)`, '', '', ''].join('\t');
    const masterBody = pvcMaster.map((r) => `${r.label}\t${r.qty}`);
    return [head, colourLine, '', fenceHdr, hdr, ...fenceRows, extra, concF, '', adobeH, 'Row\tItem\tQty', ...adobeBody, '', masterH, hdr, ...masterBody].join('\n');
  }, [pvcJob, jobAddress, pvcBreakdownColour, adobeRows, pvcMaster]);

  const copyBom = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bomTsv);
      alert('Copied material summary as TSV.');
    } catch {
      prompt('Copy:', bomTsv);
    }
  }, [bomTsv]);

  /** Chain link aggregates */
  const chainFenceInputs: FmsChainLinkFenceInput[] = useMemo(() => {
    const d7 = Math.max(0.01, Number(chainRailFt) || 10);
    const d8 = Math.max(0.01, Number(chainMeshFt) || 50);
    const d9 = Math.max(0.01, Number(chainTiesPerBag) || 100);
    return chainLines
      .map((row) => {
        const L = Math.max(0, Number(String(row.length_ft).replace(/,/g, '')) || 0);
        if (L <= 0) return null;
        const d6 = Math.max(0, Number(row.terminal_post) || 0);
        return { length_ft: L, terminal_post_type: d6, rail_length_ft: d7, mesh_roll_ft: d8, ties_per_bag: d9 };
      })
      .filter(Boolean) as FmsChainLinkFenceInput[];
  }, [chainLines, chainRailFt, chainMeshFt, chainTiesPerBag]);

  const chainFenceAgg = useMemo(() => {
    if (!chainFenceInputs.length) return null;
    const results = chainFenceInputs.map((i) => computeFmsChainLinkFenceLine(i));
    const keys = Object.keys(results[0]) as (keyof (typeof results)[0])[];
    const sum: Record<string, number> = {};
    for (const k of keys) {
      sum[k] = results.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    }
    return sum as unknown as ReturnType<typeof computeFmsChainLinkFenceLine>;
  }, [chainFenceInputs]);

  const chainGateResults = useMemo(() => {
    return chainGates
      .map((g) => {
        const w = Math.max(0, Number(String(g.width_in).replace(/,/g, '')) || 0);
        if (w <= 0) return null;
        const opening = Math.max(0, Number(String(g.opening_in).replace(/,/g, '')) || 45);
        return computeFmsChainLinkGate({
          gate_width_in: w,
          posts: g.posts,
          normal_opening_in: opening,
        });
      })
      .filter(Boolean) as ReturnType<typeof computeFmsChainLinkGate>[];
  }, [chainGates]);

  const chainGateAgg = useMemo(() => {
    if (!chainGateResults.length) return null;
    const keys = Object.keys(chainGateResults[0]) as (keyof (typeof chainGateResults)[0])[];
    const sum: Record<string, number> = {};
    for (const k of keys) {
      sum[k] = chainGateResults.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    }
    return sum as unknown as ReturnType<typeof computeFmsChainLinkGate>;
  }, [chainGateResults]);

  const hybridPreview = useMemo(() => {
    const hL = Math.max(0, Number(String(hybHLen).replace(/,/g, '')) || 0);
    const vL = Math.max(0, Number(String(hybVLen).replace(/,/g, '')) || 0);
    if (hL <= 0 && vL <= 0) return null;

    const zeroHFence: ReturnType<typeof computeHybridHorizontalWpc6ftFence> = {
      aluminum_h_post: 0,
      cap_h_post: 0,
      rail_6ft: 0,
      board: 0,
      long_black_screw_25: 0,
      u_channel: 0,
      small_black_screw: 0,
      posts: 0,
    };
    const zeroVFence: ReturnType<typeof computeHybridVerticalPvc64Fence> = {
      aluminum_h_post: 0,
      cap_h_post: 0,
      rail_8ft: 0,
      board_72: 0,
      board_stiffener: 0,
      small_black_screw: 0,
      u_channel: 0,
      long_black_screw_25: 0,
      posts: 0,
    };

    const hFence =
      hL > 0
        ? computeHybridHorizontalWpc6ftFence({
            length_ft: hL,
            fence_h_post_type: hybHHPost,
            fence_u_channel: hybHU,
          })
        : zeroHFence;
    const vFence =
      vL > 0
        ? computeHybridVerticalPvc64Fence({
            length_ft: vL,
            fence_h_post_type: hybVHPost,
            fence_u_channel: hybVU,
          })
        : zeroVFence;

    const hGw = Math.max(0, Number(String(hybHGateW).replace(/,/g, '')) || 0);
    const hGate =
      hybHGateOn && hGw > 0
        ? computeHybridHorizontalWpc6ftGate({ gate_width_in: hGw, posts: hybHGateP })
        : null;

    const vSw = Math.max(0, Number(String(hybVSingleW).replace(/,/g, '')) || 0);
    const vSingle =
      hybVSingleOn && vSw > 0 ? computeHybridVerticalPvc64GateSingle({ gate_width_in: vSw, posts: hybVSingleP }) : null;

    const vDw = Math.max(0, Number(String(hybVDoubleW).replace(/,/g, '')) || 0);
    const vDouble =
      hybVDoubleOn && vDw > 0
        ? computeHybridVerticalPvc64GateDouble({ gate_width_in: vDw, posts: hybVDoubleP })
        : null;

    return combineHybridMasterPreview({
      horizontalFence: hFence,
      horizontalGate: hGate,
      verticalFence: vFence,
      verticalGateSingle: vSingle,
      verticalGateDouble: vDouble,
    });
  }, [
    hybHLen,
    hybVLen,
    hybHHPost,
    hybHU,
    hybVHPost,
    hybVU,
    hybHGateOn,
    hybHGateW,
    hybHGateP,
    hybVSingleOn,
    hybVSingleW,
    hybVSingleP,
    hybVDoubleOn,
    hybVDoubleW,
    hybVDoubleP,
  ]);

  const applyLayoutSketchToLines = useCallback(() => {
    if (!layoutSketchData?.segments?.length) return;
    const panelModule = lines[0]?.panel_module ?? 'nominal_7ft';
    const next = drawingDataToPvcLineRows(layoutSketchData, panelModule);
    if (next?.length) setLines(next);
  }, [layoutSketchData, lines]);

  function addLine() {
    setLines((p) => [
      ...p,
      {
        id: newLineId(),
        label: `Line ${p.length + 1}`,
        length_ft: '',
        panel_module: p[0]?.panel_module ?? 'nominal_7ft',
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

  function addPvcGate(kind: 'short' | 'single' | 'double') {
    const row = emptyGateRow();
    if (kind === 'short') setShortGates((p) => [...p, row]);
    else if (kind === 'single') setSingleGates((p) => [...p, row]);
    else setDoubleGates((p) => [...p, row]);
  }

  function updatePvcGate(
    kind: 'short' | 'single' | 'double',
    id: string,
    patch: Partial<PvcGateRow>
  ) {
    const fn = (rows: PvcGateRow[]) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    if (kind === 'short') setShortGates(fn);
    else if (kind === 'single') setSingleGates(fn);
    else setDoubleGates(fn);
  }

  function removePvcGate(kind: 'short' | 'single' | 'double', id: string) {
    const fn = (rows: PvcGateRow[]) => rows.filter((r) => r.id !== id);
    if (kind === 'short') setShortGates(fn);
    else if (kind === 'single') setSingleGates(fn);
    else setDoubleGates(fn);
  }

  function renderPvcGateSection(
    title: string,
    hint: string,
    kind: 'short' | 'single' | 'double',
    rows: PvcGateRow[]
  ) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-slate-800">{title}</span>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
          <button type="button" className={btnGhost} onClick={() => addPvcGate(kind)}>
            + Add
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">None</p>
        ) : (
          <div className="space-y-2">
            {rows.map((g, i) => (
              <div key={g.id} className="flex flex-wrap items-end gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-100">
                <span className="text-xs text-slate-400">#{i + 1}</span>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Width (in)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={g.width_in}
                    onChange={(e) => updatePvcGate(kind, g.id, { width_in: e.target.value })}
                    className={`${field} w-28`}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Posts</label>
                  <select
                    value={g.posts}
                    onChange={(e) =>
                      updatePvcGate(kind, g.id, { posts: Number(e.target.value) as FmsPvcGatePosts })
                    }
                    className={`${field} w-20`}
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
                <button type="button" className={btnGhost} onClick={() => removePvcGate(kind, g.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 pb-24">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Material calculator (FMS)</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Takeoff aligned to the 2026 FMS workbook: PVC includes fence lines, short / single / double gates (Excel gate
          block), per-colour Material List Breakdown labels (pick the same colour tab you use in Excel), Master column C
          totals with optional column M adders, and hybrid horizontal WPC + vertical PVC colours. Chain link and
          hybrid tabs run the ported formula modules from their calculator sheets.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          For a configurable per-panel BOM (rails rule, custom items), use{' '}
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
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address / label</label>
                <input
                  type="text"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  placeholder="e.g. 53 Rothesay"
                  className={`${field} w-full max-w-xl`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">PVC colour (breakdown tab)</label>
                <select
                  value={pvcBreakdownColour}
                  onChange={(e) => setPvcBreakdownColour(e.target.value as FmsPvcCalculatorColour)}
                  className={`${field} w-full max-w-xs`}
                >
                  {FMS_PVC_CALCULATOR_COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Matches the per-colour &quot;Material List Breakdown&quot; sheet name in Excel. Line math is shared
                  across colours; use this so headings and TSV match the tab you are filling in. Optional URL:{' '}
                  <code className="rounded bg-slate-100 px-1 text-[11px]">?tab=pvc&amp;pvc_colour=Moonlit</code>
                </p>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-violet-50/25 px-5 py-4">
              <h2 className={h2}>Layout sketch</h2>
              <p className="mt-1 text-xs text-slate-500">
                Draw the fence in plan view, enter each segment length in feet, then apply. New segments snap to the
                previous end within 2 ft; if the next segment is within 3° of straight, it snaps colinear. Sharper
                corners are treated as a U-channel on the run that ends there; nearly straight joints stay on a
                continuous H-post run.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="h-[min(420px,55vh)] min-h-[280px] w-full">
                <LayoutDrawCanvas onDrawingChange={setLayoutSketchData} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btn}
                  disabled={!layoutSketchData?.segments?.length}
                  onClick={applyLayoutSketchToLines}
                >
                  Apply sketch to fence runs
                </button>
                {lines.some((l) => l.fromSketch) && (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => setLines((prev) => prev.map((l) => ({ ...l, fromSketch: false })))}
                  >
                    Unlock line ends (manual D6 / D7)
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
              <h2 className={h2}>Fence lines</h2>
              <p className="mt-1 text-xs text-slate-500">
                Use the layout sketch above to drive runs and U-channels at corners, or set lines manually.{' '}
                <strong className="text-slate-700">H-post end</strong> = Excel D6=1, D7=0 (continuous line on slit
                post). <strong className="text-slate-700">U-channel end</strong> = D6=1, D7=1 (terminal U).{' '}
                <em className="not-italic text-slate-600">Custom</em> covers other workbook 0/1/2 + U values.
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
                  {row.fromSketch && (
                    <p className="mb-3 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-violet-900">
                      From layout sketch: U-channel (D7) is set at corners where the path turns more than 3° from
                      straight; straighter joints stay on one H-post run.
                    </p>
                  )}
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
                        disabled={row.fromSketch}
                        className={`${field} w-full disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
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
                            disabled={row.fromSketch}
                            className={`${field} w-full disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
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
                            disabled={row.fromSketch}
                            className={`${field} w-full disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
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
            <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50/40 via-white to-slate-50/80 px-5 py-4">
              <h2 className={h2}>Gates (PVC workbook)</h2>
              <p className="mt-1 text-xs text-slate-500">
                Short (&lt; 59.5&quot;), single (≥ 65.5&quot;), and double (≥ 106&quot;) paths from the Material
                Calculator — PVC sheet. Width is inside gate in inches; posts matches sheet columns B/G/K. Gate
                quantities follow the same logic for all PVC colours; your selected colour ({pvcBreakdownColour}) applies
                to the breakdown and Master sections below.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {renderPvcGateSection('Short gates', 'Under 59.5″ opening — columns B/C.', 'short', shortGates)}
              {renderPvcGateSection('Single gates', '≥ 65.5″ — columns G/H.', 'single', singleGates)}
              {renderPvcGateSection('Double gates', '≥ 106″ — columns K/L.', 'double', doubleGates)}
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Optional Master column M adders</h2>
              <p className="mt-1 text-xs text-slate-500">
                Same-row manual quantities from the Master sheet (added inside the C formulas). Leave blank for zero.
              </p>
            </div>
            <div className="p-5">
              <button type="button" className={btnGhost} onClick={() => setMasterExtrasOpen((o) => !o)}>
                {masterExtrasOpen ? 'Hide' : 'Show'} M6–M24 fields
              </button>
              {masterExtrasOpen && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {MASTER_EXTRA_KEYS.map((k) => (
                    <div key={k}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                        {MASTER_EXTRA_LABELS[k]}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={masterExtras[k] ?? ''}
                        onChange={(e) => setMasterExtras((p) => ({ ...p, [k]: e.target.value }))}
                        className={`${field} w-full`}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>{fmsPvcMaterialListBreakdownTitle(pvcBreakdownColour)} + Master column C</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fence rows 2–14 sum all lines; gate rows 18–33 sum all gates; row 17 is total gate width (in) ÷ 12.
                Master list includes +10 on hole plugs and large screws per workbook. J-column totals are labelled for
                your selected Excel colour tab.
              </p>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {pvcBreakdownColour} — J totals (breakdown sheet)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adobeRows.map((r) => (
                        <tr key={r.row} className="border-b border-slate-100">
                          <td className="px-2 py-1.5 tabular-nums text-slate-500">{r.row}</td>
                          <td className="px-2 py-1.5 text-slate-800">{r.label}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">{r.qty}</td>
                        </tr>
                      ))}
                      {adobeRows.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-2 py-4 text-center text-slate-500">
                            Add fence lines or gates.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Master material (C) — {pvcBreakdownColour}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pvcMaster.map((r, idx) => (
                        <tr key={`${idx}-${r.label || 'row'}`} className="border-b border-slate-100">
                          <td className="px-2 py-1.5 font-medium text-slate-800">{r.label || '\u00a0'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">{r.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Fence-only SKU rollup (Excel block)</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sums the PVC calculator fence columns only (no gates). Use Master table above for full job order qty
                including gates.
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
                    <td className="px-2 py-2 font-medium text-slate-800">Concrete bags (fence H-post × 2.5)</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {pvcJob.concrete_bags_est}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={copyBom} className={btn}>
                  Copy TSV (fence + {pvcBreakdownColour} breakdown + Master)
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
        <>
          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Chain link fence</h2>
              <p className="mt-1 text-xs text-slate-500">
                Primary block from Material Calculator — Chain link (rows 10–27). Terminal post type is Excel D6;
                rail / mesh / ties divisors match D7–D9.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Rail length divisor (ft)</label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={chainRailFt}
                    onChange={(e) => setChainRailFt(e.target.value)}
                    className={`${field} w-full`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Mesh roll divisor (ft)</label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={chainMeshFt}
                    onChange={(e) => setChainMeshFt(e.target.value)}
                    className={`${field} w-full`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Ties per bag</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={chainTiesPerBag}
                    onChange={(e) => setChainTiesPerBag(e.target.value)}
                    className={`${field} w-full`}
                  />
                </div>
              </div>
              {chainLines.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-4"
                >
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Label</label>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        setChainLines((rows) => rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))
                      }
                      className={`${field} w-32`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Length (ft)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={row.length_ft}
                      onChange={(e) =>
                        setChainLines((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, length_ft: e.target.value } : r))
                        )
                      }
                      className={`${field} w-28`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Terminal post (D6)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.terminal_post}
                      onChange={(e) =>
                        setChainLines((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, terminal_post: e.target.value } : r))
                        )
                      }
                      className={`${field} w-24`}
                    />
                  </div>
                  <button
                    type="button"
                    className={btnGhost}
                    disabled={chainLines.length <= 1}
                    onClick={() => setChainLines((rows) => rows.filter((r) => r.id !== row.id))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  setChainLines((rows) => [
                    ...rows,
                    { id: newLineId(), label: `Run ${rows.length + 1}`, length_ft: '', terminal_post: '2' },
                  ])
                }
              >
                + Add run
              </button>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Chain link gates</h2>
              <p className="mt-1 text-xs text-slate-500">Gate block (sheet rows 37–45 style): frame, posts, extension, hardware.</p>
            </div>
            <div className="p-5">
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  setChainGates((g) => [
                    ...g,
                    { id: newLineId(), width_in: '', posts: 1, opening_in: '45' },
                  ])
                }
              >
                + Add gate
              </button>
              <div className="mt-3 space-y-2">
                {chainGates.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-white p-3">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Width (in)</label>
                      <input
                        type="number"
                        min={0}
                        value={g.width_in}
                        onChange={(e) =>
                          setChainGates((rows) => rows.map((r) => (r.id === g.id ? { ...r, width_in: e.target.value } : r)))
                        }
                        className={`${field} w-24`}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Posts</label>
                      <select
                        value={g.posts}
                        onChange={(e) =>
                          setChainGates((rows) =>
                            rows.map((r) =>
                              r.id === g.id ? { ...r, posts: Number(e.target.value) as FmsPvcGatePosts } : r
                            )
                          )
                        }
                        className={`${field} w-20`}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Normal opening (in)</label>
                      <input
                        type="number"
                        min={0}
                        value={g.opening_in}
                        onChange={(e) =>
                          setChainGates((rows) =>
                            rows.map((r) => (r.id === g.id ? { ...r, opening_in: e.target.value } : r))
                          )
                        }
                        className={`${field} w-24`}
                      />
                    </div>
                    <button type="button" className={btnGhost} onClick={() => setChainGates((rows) => rows.filter((r) => r.id !== g.id))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Totals</h2>
            </div>
            <div className="overflow-x-auto p-5">
              {!chainFenceAgg ? (
                <p className="text-sm text-slate-500">Enter at least one fence run length.</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Fence (summed runs)</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {(
                          [
                            ['Terminal post', chainFenceAgg.terminal_post],
                            ['Line post', chainFenceAgg.line_post],
                            ['Terminal post cap', chainFenceAgg.terminal_post_cap],
                            ['Line post loop cap', chainFenceAgg.line_post_loop_cap],
                            ['Rail end', chainFenceAgg.rail_end],
                            ['Rail', chainFenceAgg.rail],
                            ['Center band', chainFenceAgg.center_band],
                            ['Offset band', chainFenceAgg.offset_band],
                            ['Tension bar', chainFenceAgg.tension_bar],
                            ['Mesh (rolls)', chainFenceAgg.mesh],
                            ['Bottom wire (ft)', chainFenceAgg.bottom_wire],
                            ['Ties (est.)', chainFenceAgg.ties],
                            ['Carriage bolt + nut', chainFenceAgg.carriage_bolt_nut],
                            ['Hog rings (note L/2)', chainFenceAgg.hog_rings_note],
                          ] as const
                        ).map(([label, qty]) => (
                          <tr key={label} className="border-b border-slate-100">
                            <td className="py-1.5 font-medium text-slate-800">{label}</td>
                            <td className="py-1.5 text-right tabular-nums">{qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Gates (summed)</h3>
                    {!chainGateAgg ? (
                      <p className="text-xs text-slate-500">No gates with width entered.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {(
                            [
                              ['Pre-assembled frame', chainGateAgg.pre_assembled_frame],
                              ['Post', chainGateAgg.post],
                              ['End post cap', chainGateAgg.end_post_cap],
                              ['Gate extension kit', chainGateAgg.gate_extension_kit],
                              ['Hardware kit', chainGateAgg.hardware_kit],
                            ] as const
                          ).map(([label, qty]) => (
                            <tr key={label} className="border-b border-slate-100">
                              <td className="py-1.5 font-medium text-slate-800">{label}</td>
                              <td className="py-1.5 text-right tabular-nums">{qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {tab === 'hybrid' && (
        <>
          <section className={card}>
            <div className="border-b border-amber-100 bg-amber-50/30 px-5 py-4">
              <h2 className={h2}>{fmsWpcHorizontalCalculatorTitle(hybridWpcColour)}</h2>
              <p className="mt-1 text-xs text-slate-600">
                From Horizontal Material Calculator. Leave length blank or zero to omit horizontal from the combined
                preview. Pick the WPC colour tab you use in Excel for this run.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">WPC colour (sheet)</label>
                <select
                  value={hybridWpcColour}
                  onChange={(e) => setHybridWpcColour(e.target.value as FmsWpcCalculatorColour)}
                  className={`${field} w-full`}
                >
                  {FMS_WPC_CALCULATOR_COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Length (ft)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={hybHLen}
                  onChange={(e) => setHybHLen(e.target.value)}
                  className={`${field} w-full`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">H-post type (0–2)</label>
                <select
                  value={hybHHPost}
                  onChange={(e) => setHybHHPost(Number(e.target.value) as 0 | 1 | 2)}
                  className={`${field} w-full`}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">U-channel (0–2)</label>
                <select value={hybHU} onChange={(e) => setHybHU(Number(e.target.value) as 0 | 1 | 2)} className={`${field} w-full`}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={hybHGateOn} onChange={(e) => setHybHGateOn(e.target.checked)} />
                Horizontal gate
              </label>
              {hybHGateOn && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Width (in)</label>
                    <input
                      type="number"
                      min={0}
                      value={hybHGateW}
                      onChange={(e) => setHybHGateW(e.target.value)}
                      className={`${field} w-28`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Posts</label>
                    <select
                      value={hybHGateP}
                      onChange={(e) => setHybHGateP(Number(e.target.value) as FmsPvcGatePosts)}
                      className={`${field} w-20`}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-blue-100 bg-blue-50/20 px-5 py-4">
              <h2 className={h2}>{fmsPvcVerticalCalculatorTitle(hybridPvcColour)}</h2>
              <p className="mt-1 text-xs text-slate-600">
                From Vertical Material Calculator (8 ft panel divisor). Choose the PVC colour sheet that matches this
                vertical section.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">PVC colour (sheet)</label>
                <select
                  value={hybridPvcColour}
                  onChange={(e) => setHybridPvcColour(e.target.value as FmsPvcCalculatorColour)}
                  className={`${field} w-full`}
                >
                  {FMS_PVC_CALCULATOR_COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Length (ft)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={hybVLen}
                  onChange={(e) => setHybVLen(e.target.value)}
                  className={`${field} w-full`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">H-post type (0–2)</label>
                <select
                  value={hybVHPost}
                  onChange={(e) => setHybVHPost(Number(e.target.value) as 0 | 1 | 2)}
                  className={`${field} w-full`}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">U-channel (0–2)</label>
                <select value={hybVU} onChange={(e) => setHybVU(Number(e.target.value) as 0 | 1 | 2)} className={`${field} w-full`}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
            </div>
            <div className="space-y-4 border-t border-slate-100 px-5 py-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={hybVSingleOn} onChange={(e) => setHybVSingleOn(e.target.checked)} />
                  Single gate
                </label>
                {hybVSingleOn && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <input
                      type="number"
                      placeholder="Width in"
                      value={hybVSingleW}
                      onChange={(e) => setHybVSingleW(e.target.value)}
                      className={`${field} w-28`}
                    />
                    <select
                      value={hybVSingleP}
                      onChange={(e) => setHybVSingleP(Number(e.target.value) as FmsPvcGatePosts)}
                      className={`${field} w-20`}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={hybVDoubleOn} onChange={(e) => setHybVDoubleOn(e.target.checked)} />
                  Double gate
                </label>
                {hybVDoubleOn && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <input
                      type="number"
                      placeholder="Width in"
                      value={hybVDoubleW}
                      onChange={(e) => setHybVDoubleW(e.target.value)}
                      className={`${field} w-28`}
                    />
                    <select
                      value={hybVDoubleP}
                      onChange={(e) => setHybVDoubleP(Number(e.target.value) as FmsPvcGatePosts)}
                      className={`${field} w-20`}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Hybrid master preview</h2>
              <p className="mt-1 text-xs text-slate-600">
                Colours for this preview: <strong className="font-medium text-slate-800">{hybridWpcColour}</strong>{' '}
                (horizontal WPC) · <strong className="font-medium text-slate-800">{hybridPvcColour}</strong> (vertical
                PVC). Use the same pairing you use on the hybrid master / colour sheets in Excel. Optional URL:{' '}
                <code className="rounded bg-slate-100 px-1 text-[11px]">
                  ?tab=hybrid&amp;hybrid_wpc=Walnut&amp;hybrid_pvc=Adobe
                </code>
              </p>
              <p className="mt-2 text-xs text-amber-800/90">
                Simplified combined list: concrete uses total caps × 2.5 (Hybrid C5=C7×2.5). Some screw and U-channel
                lines are merged approximations — verify against the full hybrid master workbook for exact row parity.
              </p>
            </div>
            <div className="p-5">
              {!hybridPreview ? (
                <p className="text-sm text-slate-500">Enter at least one horizontal or vertical fence length.</p>
              ) : (
                <table className="w-full max-w-xl text-sm">
                  <tbody>
                    {hybridPreview.map((r) => (
                      <tr key={r.label} className="border-b border-slate-100">
                        <td className="py-1.5 font-medium text-slate-800">{r.label}</td>
                        <td className="py-1.5 text-right tabular-nums">{r.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
