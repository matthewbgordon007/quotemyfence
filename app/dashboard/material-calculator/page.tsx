'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { applyMaterialQuoteCalculatorFields, inferFmsHubMaterialFromQuoteProject } from '@/lib/material-quote-fms-calculator-style';
import {
  excludeMaterialLabels,
  isMaterialIncluded,
  parseMaterialExclusions,
  postRelatedMaterialLabels,
  toggleMaterialExclusion,
  type MaterialCalcTab,
  type MaterialExclusions,
} from '@/lib/material-exclusions';
import {
  aggregateFmsPvcFenceLines,
  computeFmsPvcFenceLine,
  FMS_PVC_PANEL_HEIGHT_LABELS,
  defaultFmsPvcPanelSpacingFt,
  type FmsPvcFenceLineInput,
  type FmsPvcPanelModule,
} from '@/lib/fms-pvc-material-calculator';
import {
  adobeBreakdownToMergedRows,
  applySharedBoundaryDedupToAdobeBreakdown,
  buildPvcAdobeBreakdown,
  computePvcMasterColumn,
  pvcQtyPercentAdd,
  type FmsPvcMasterExtras,
  type FmsPvcMasterPercentUplifts,
} from '@/lib/fms-pvc-breakdown-master';
import { LARGE_WARE_TITLE, SMALL_WARE_TITLE, splitWare } from '@/lib/material-ware';
import { boardStiffenersForBoardCount, formatLooseExtra, formatPacksCell } from '@/lib/pvc-material-packs';
import {
  normalizeFmsCalculatorRecipe,
  type FmsCalculatorRecipeV1,
} from '@/lib/fms-calculator-recipe';
import { FmsCalculatorRecipeEditor } from '@/components/dashboard/FmsCalculatorRecipeEditor';
import { buildMasterMaterialListPdfRows } from '@/lib/master-material-list-pdf-data';
import {
  computeFmsPvcDoubleGate,
  computeFmsPvcShortGate,
  computeFmsPvcSingleGate,
  sumGateAdobeRows,
  FMS_GATE_POST_COUNT,
  type FmsPvcAdobeGateMap,
  type FmsPvcGatePosts,
} from '@/lib/fms-pvc-gates-calculator';
import {
  aggregateFmsChainLinkFenceLines,
  computeFmsChainLinkFenceLine,
  computeFmsChainLinkGate,
  type FmsChainLinkFenceInput,
} from '@/lib/fms-chain-link-calculator';
import {
  FMS_HYBRID_HO_BOARD_MATERIALS,
  FMS_HYBRID_MATERIAL_LINES,
  FMS_HYBRID_VE_BLOCK_TITLE,
  buildFmsHybridMasterList,
  classifyHybridHGateInputs,
  computeHybridHorizontalFence,
  computeHybridHorizontalGateBlockRows,
  computeHybridVerticalGateBlockRows,
  classifyHybridVGateInputs,
  computeHybridVerticalPvc64Fence,
  coerceFmsHybridHoBoardMaterial,
  fmsHybridHoBoardMaterialCalculatorFamily,
  fmsHybridHoBoardMaterialColourLine,
  fmsHybridHoBoardMaterialLabel,
  inferFmsHybridHoBoardMaterialFromStyle,
  applySharedBoundaryDedupToHybridRows,
  sumFmsHybridRows,
  type FmsHybridHoBoardMaterial,
  type FmsHybridHoHeight,
  type FmsHybridItemRow,
} from '@/lib/fms-hybrid-calculators';
import {
  FMS_PVC_CALCULATOR_COLOURS,
  coerceFmsHybridCalculatorColour,
  coerceFmsPvcCalculatorColour,
  coerceFmsWpcCalculatorColour,
  fmsHybridColourExportLabel,
  fmsHybridColourForMaterial,
  fmsHybridColoursForMaterial,
  fmsPvcMaterialListBreakdownTitle,
  type FmsHybridMaterialLine,
  type FmsPvcCalculatorColour,
  type FmsWpcCalculatorColour,
} from '@/lib/fms-calculator-colour-presets';
import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';
import { MaterialQuoteImportBanner } from '@/components/dashboard/MaterialQuoteImportBanner';
import { SupplierMaterialQuoteActions } from '@/components/dashboard/SupplierMaterialQuoteActions';
import type { MaterialQuoteLine } from '@/lib/material-quote-lines';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import {
  mapFenceSegmentsToLayoutDrawing,
  type MapFenceGate,
  type MapFenceSegment,
} from '@/lib/map-fence-to-layout-drawing';
import {
  alignChainedSketchSegments,
  grossLengthFtForSketchSegment,
  layoutPointsToSegmentPairs,
  layoutSegmentsToPvcFenceInputsPerSketchSegment,
  netFenceLengthFtForSegment,
  PVC_DOUBLE_GATE_MIN_IN,
  PVC_SHORT_GATE_MAX_IN,
  PVC_STANDARD_GATE_WIDTH_IN,
  removeLayoutDrawingGatePlacement,
  removeLayoutDrawingSegment,
  segmentRunEndTerminationsForSketch,
  fenceCalcLengthFtForSketchFenceRun,
  detectSharedBoundaryDoubleCounts,
  normalizeLayoutSketchJoints,
  resolveJobRunTerminations,
  PVC_SINGLE_GATE_MIN_IN,
  sketchGateWidthInches,
  sketchGateSegmentRole,
  sketchSegmentRunLabel,
  type SegmentRunEnds,
  jointPositionsFromAligned,
  LAYOUT_CHAIN_ALIGN_FT,
  LAYOUT_MIN_SKETCH_SEGMENT_FT,
  type SketchGatePlacement,
  type SketchJointTermination,
} from '@/lib/layout-sketch-to-pvc-inputs';

const card =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const h2 = 'text-base font-semibold text-slate-900';
const field =
  'rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';
const btn =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50';
const btnGhost = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50';
const btnReset =
  'rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50';
const tabBase =
  'flex min-w-[7.5rem] flex-col items-start gap-0.5 rounded-xl px-4 py-2.5 text-left transition-all border';
const tabActive = 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20';
const tabIdle = 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border-slate-200';

/** Small label that breaks the page into clear stages (Build vs. Results). */
const stageLabel = 'flex items-center gap-3 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400';

/**
 * Card whose body is hidden by default behind a "Show / Hide" toggle.
 * Used for secondary panels so the main flow stays short. Uses native <details>
 * so it needs no extra state.
 */
function CollapsibleCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={`${card} group`} {...(defaultOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className={h2}>{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 group-hover:bg-slate-50">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 transition-transform group-open:rotate-180">
            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-slate-100">{children}</div>
    </details>
  );
}

/** Optional fine-tuning block — collapsed by default when the sketch already filled in runs. */
function TuningSection({
  defaultOpen,
  children,
}: {
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <CollapsibleCard
      title="Adjust lengths & gates"
      subtitle="Open only if something from your sketch needs a tweak."
      defaultOpen={defaultOpen}
    >
      <div className="space-y-6 p-5">{children}</div>
    </CollapsibleCard>
  );
}

function fmtQty(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Item / Final table mirroring the Excel block layout. */
function WareHeaderTr({ title }: { title: string }) {
  return (
    <tr className="border-b border-slate-200 bg-slate-100">
      <td colSpan={2} className="py-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
        {title}
      </td>
    </tr>
  );
}

function HybridItemTable({
  rows,
  groupWare = false,
  tab,
  materialExclusions,
  onToggleInclude,
}: {
  rows: FmsHybridItemRow[];
  groupWare?: boolean;
  tab?: MaterialCalcTab;
  materialExclusions?: MaterialExclusions;
  onToggleInclude?: (label: string, included: boolean) => void;
}) {
  const showInclude = Boolean(tab && materialExclusions && onToggleInclude);
  const body = groupWare ? splitWare(rows, (r) => r.item) : null;
  const renderRows = (rs: FmsHybridItemRow[]) =>
    rs.map((r) => {
      const included = tab && materialExclusions ? isMaterialIncluded(materialExclusions, tab, r.item) : true;
      return (
        <tr
          key={r.item}
          className={`border-b border-slate-100 ${!included ? 'bg-slate-50/80 opacity-55' : ''}`}
        >
          {showInclude && tab && onToggleInclude ? (
            <td className="w-10 py-1.5 pl-1">
              <input
                type="checkbox"
                checked={included}
                onChange={(e) => onToggleInclude(r.item, e.target.checked)}
                title={included ? 'Include on order' : 'Excluded from order'}
                className="h-4 w-4 rounded border-slate-300"
              />
            </td>
          ) : null}
          <td className={`py-1.5 font-medium ${included ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
            {r.item}
          </td>
          <td className={`py-1.5 text-right tabular-nums ${included ? '' : 'text-slate-400 line-through'}`}>
            {fmtQty(r.final)}
          </td>
        </tr>
      );
    });
  return (
    <table className="w-full max-w-md text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {showInclude ? <th className="w-10 py-1 pl-1 font-bold">Inc.</th> : null}
          <th className="py-1 font-bold">Item</th>
          <th className="py-1 text-right font-bold">Qty</th>
        </tr>
      </thead>
      <tbody>
        {body ? (
          <>
            <WareHeaderTr title={LARGE_WARE_TITLE} />
            {renderRows(body.large)}
            <WareHeaderTr title={SMALL_WARE_TITLE} />
            {renderRows(body.small)}
          </>
        ) : (
          renderRows(rows)
        )}
      </tbody>
    </table>
  );
}

type StyleTab = 'pvc' | 'chain' | 'hybrid_h' | 'hybrid_v';

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
  /** User unlocked post/end fields — sketch sync must not revert this row. */
  manualRunEdit?: boolean;
  /** Per-end H-post / U-channel (Excel D6/D7 per run). */
  run_ends?: SegmentRunEnds;
}

type LayoutSketchDrawingPayload = {
  points: { x: number; y: number }[];
  segments: { length_ft: number }[];
  gates: { type: 'single' | 'double'; quantity: number }[];
  gate_placements: {
    type: 'single' | 'double';
    line_index: number;
    x?: number;
    y?: number;
    width_in?: number;
  }[];
  total_length_ft: number;
  /** Per vertex (count = segments + 1): explicit H-post / U-channel for PVC D6/D7 at each corner or open end. */
  joint_terminations?: SketchJointTermination[];
};

type ChainLineRow = {
  id: string;
  label: string;
  length_ft: string;
  terminal_post: string;
  /** Per-end H-post (Excel D6 per run). */
  run_ends?: SegmentRunEnds;
  /** When true, lengths / D6 came from the layout sketch (same corner logic as PVC). */
  fromSketch?: boolean;
  manualRunEdit?: boolean;
};

/** One Excel fence-line block on the hybrid horizontal / vertical calculator tabs. */
type HybridLineRow = {
  id: string;
  label: string;
  length_ft: string;
  h_post: 0 | 1 | 2;
  u_channel: 0 | 1 | 2;
  run_ends?: SegmentRunEnds;
  /** When true, length / posts came from the layout sketch (same corner logic as PVC). */
  fromSketch?: boolean;
  manualRunEdit?: boolean;
};

/** Hybrid horizontal gate row — same as PVC plus optional adjoining for adjacent/double blocks. */
type HybridHFenceGateRow = PvcGateRow & { adjoining?: 0 | 1 | 2 };
/** Hybrid vertical gate row — same as PVC. */
type HybridVFenceGateRow = PvcGateRow;

function parseHybridVFenceGateRows(raw: unknown): HybridVFenceGateRow[] {
  if (!Array.isArray(raw)) return [];
  const out: HybridVFenceGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: FMS_GATE_POST_COUNT,
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    });
  }
  return out;
}

function migrateLegacyHybridVGates(raw: unknown): {
  short: HybridVFenceGateRow[];
  single: HybridVFenceGateRow[];
  double: HybridVFenceGateRow[];
} | null {
  if (!Array.isArray(raw)) return null;
  const short: HybridVFenceGateRow[] = [];
  const single: HybridVFenceGateRow[] = [];
  const double: HybridVFenceGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const item: HybridVFenceGateRow = {
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: FMS_GATE_POST_COUNT,
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    };
    if (o.kind === 'double') double.push(item);
    else if (Number(String(item.width_in).replace(/,/g, '')) < PVC_SHORT_GATE_MAX_IN) short.push(item);
    else single.push(item);
  }
  return short.length || single.length || double.length ? { short, single, double } : null;
}

function drawingDataToPvcLineRows(
  drawing: {
    points: { x: number; y: number }[];
    segments: { length_ft?: number }[];
    gate_placements?: SketchGatePlacement[];
    joint_terminations?: SketchJointTermination[] | null;
  },
  panelModule: FmsPvcPanelModule
): PvcLineRow[] | null {
  const pairs = layoutPointsToSegmentPairs(drawing.points, drawing.segments);
  if (pairs.length === 0) return null;
  const gatePlacements = drawing.gate_placements;
  // One calculator row per drawn segment (do not merge colinear runs — matches sketch line count).
  const grossPerSeg = pairs.map((pair, i) =>
    grossLengthFtForSketchSegment(i, pair, drawing.segments)
  );
  const netPerSeg = grossPerSeg.map((gross, i) =>
    netFenceLengthFtForSegment(i, gross, gatePlacements, drawing.segments)
  );
  const inputs = layoutSegmentsToPvcFenceInputsPerSketchSegment(pairs, grossPerSeg, panelModule, {
    jointTerminations: drawing.joint_terminations ?? null,
    gatePlacements,
  });
  return drawing.segments.map((_, i) => {
    const inp = inputs[i];
    const gross = grossPerSeg[i] ?? 0;
    const net = netPerSeg[i] ?? 0;
    const runEnds = segmentRunEndTerminationsForSketch(pairs, grossPerSeg, i, {
      jointTerminations: drawing.joint_terminations ?? null,
      gatePlacements,
    });
    const d6d7 = runEnds ? d6d7FromRunEnds(runEnds) : { d6: inp?.fence_terminated_h_post_type ?? 0, d7: Number(inp?.fence_terminated_u_channel ?? 0) };
    return {
      id: newLineId(),
      label: sketchSegmentRunLabel(i, drawing.segments.length, net, gatePlacements, drawing.segments),
      length_ft: gross > 0 ? String(gross) : '',
      panel_module: panelModule,
      end_preset: 'custom' as const,
      h_post_type: d6d7.d6 as 0 | 1 | 2,
      u_channel: String(d6d7.d7),
      ...(runEnds ? { run_ends: runEnds } : {}),
      fromSketch: true,
    };
  });
}

/** Same segment geometry as PVC; chain link uses Excel D6 per run (`terminal_post`). */
function drawingDataToChainLineRows(
  drawing: {
    points: { x: number; y: number }[];
    segments: { length_ft?: number }[];
    gate_placements?: SketchGatePlacement[];
    joint_terminations?: SketchJointTermination[] | null;
  },
  panelModule: FmsPvcPanelModule
): ChainLineRow[] | null {
  const pairs = layoutPointsToSegmentPairs(drawing.points, drawing.segments);
  if (pairs.length === 0) return null;
  const gatePlacements = drawing.gate_placements;
  const grossPerSeg = pairs.map((pair, i) =>
    grossLengthFtForSketchSegment(i, pair, drawing.segments)
  );
  const netPerSeg = grossPerSeg.map((gross, i) =>
    netFenceLengthFtForSegment(i, gross, gatePlacements, drawing.segments)
  );
  const inputs = layoutSegmentsToPvcFenceInputsPerSketchSegment(pairs, grossPerSeg, panelModule, {
    jointTerminations: drawing.joint_terminations ?? null,
    gatePlacements,
  });
  return drawing.segments.map((_, i) => {
    const inp = inputs[i];
    const gross = grossPerSeg[i] ?? 0;
    const net = netPerSeg[i] ?? 0;
    const runEnds = segmentRunEndTerminationsForSketch(pairs, grossPerSeg, i, {
      jointTerminations: drawing.joint_terminations ?? null,
      gatePlacements,
    });
    const d6 = runEnds
      ? d6d7FromRunEnds(runEnds).d6
      : ((inp?.fence_terminated_h_post_type ?? 0) as 0 | 1 | 2);
    return {
      id: newLineId(),
      label: sketchSegmentRunLabel(i, drawing.segments.length, net, gatePlacements, drawing.segments),
      length_ft: gross > 0 ? String(gross) : '',
      terminal_post: String(d6),
      ...(runEnds ? { run_ends: runEnds } : {}),
      fromSketch: true,
    };
  });
}

/** Same segment geometry as PVC; hybrid vertical uses Excel D6 (H post) / D7 (U channel) per run. */
function drawingDataToHybridVLineRows(
  drawing: {
    points: { x: number; y: number }[];
    segments: { length_ft?: number }[];
    gate_placements?: SketchGatePlacement[];
    joint_terminations?: SketchJointTermination[] | null;
  },
  panelModule: FmsPvcPanelModule
): HybridLineRow[] | null {
  const pairs = layoutPointsToSegmentPairs(drawing.points, drawing.segments);
  if (pairs.length === 0) return null;
  const gatePlacements = drawing.gate_placements;
  const grossPerSeg = pairs.map((pair, i) =>
    grossLengthFtForSketchSegment(i, pair, drawing.segments)
  );
  const netPerSeg = grossPerSeg.map((gross, i) =>
    netFenceLengthFtForSegment(i, gross, gatePlacements, drawing.segments)
  );
  const inputs = layoutSegmentsToPvcFenceInputsPerSketchSegment(pairs, grossPerSeg, panelModule, {
    jointTerminations: drawing.joint_terminations ?? null,
    gatePlacements,
  });
  return drawing.segments.map((_, i) => {
    const inp = inputs[i];
    const gross = grossPerSeg[i] ?? 0;
    const net = netPerSeg[i] ?? 0;
    const runEnds = segmentRunEndTerminationsForSketch(pairs, grossPerSeg, i, {
      jointTerminations: drawing.joint_terminations ?? null,
      gatePlacements,
    });
    const d6d7 = runEnds
      ? d6d7FromRunEnds(runEnds)
      : {
          d6: (inp?.fence_terminated_h_post_type ?? 0) as 0 | 1 | 2,
          d7: Number(inp?.fence_terminated_u_channel ?? 0),
        };
    return {
      id: newLineId(),
      label: sketchSegmentRunLabel(i, drawing.segments.length, net, gatePlacements, drawing.segments),
      length_ft: gross > 0 ? String(gross) : '',
      h_post: d6d7.d6,
      u_channel: Math.max(0, Math.min(2, Math.round(d6d7.d7))) as 0 | 1 | 2,
      ...(runEnds ? { run_ends: runEnds } : {}),
      fromSketch: true,
    };
  });
}

/** Sketch redraw: refresh linked runs; keep post/end overrides when user unlocked edit mode. */
function mergePvcLineFromSketch(row: PvcLineRow, old: PvcLineRow | undefined): PvcLineRow {
  if (!old) return row;
  if (old.manualRunEdit) {
    return {
      ...row,
      id: old.id,
      label: row.label,
      length_ft: row.length_ft,
      run_ends: old.run_ends ?? row.run_ends,
      end_preset: old.end_preset,
      h_post_type: old.h_post_type,
      u_channel: old.u_channel,
      manualRunEdit: true,
      fromSketch: false,
    };
  }
  return { ...row, id: old.id, label: row.label, run_ends: row.run_ends };
}

function mergeFenceLineFromSketch<
  T extends {
    fromSketch?: boolean;
    manualRunEdit?: boolean;
    id: string;
    label: string;
    length_ft: string;
    h_post?: 0 | 1 | 2;
    u_channel?: 0 | 1 | 2;
    run_ends?: SegmentRunEnds;
  },
>(row: T, old: T | undefined): T {
  if (!old) return row;
  if (old.manualRunEdit) {
    return {
      ...row,
      id: old.id,
      label: row.label,
      length_ft: row.length_ft,
      h_post: old.h_post ?? row.h_post,
      u_channel: old.u_channel ?? row.u_channel,
      run_ends: old.run_ends ?? row.run_ends,
      manualRunEdit: true,
      fromSketch: false,
    };
  }
  return { ...row, id: old.id, label: row.label, run_ends: row.run_ends };
}

function sketchFenceRowsNeedRefresh<T extends { length_ft: string }>(
  prev: T[],
  next: T[] | null,
  sketchKey: string,
  lastSketchKey: string
): boolean {
  if (!next?.length) return false;
  if (sketchKey !== lastSketchKey) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (!prev[i]) return true;
    if (String(next[i].length_ft) !== String(prev[i].length_ft)) return true;
  }
  return false;
}

function layoutSketchDataKey(data: {
  points?: { x: number; y: number }[];
  segments?: { length_ft?: number }[];
  gate_placements?: unknown[];
} | null): string {
  if (!data) return '';
  return JSON.stringify({ p: data.points, s: data.segments, g: data.gate_placements });
}

interface PvcGateRow {
  id: string;
  width_in: string;
  posts: FmsPvcGatePosts;
  /** Index in layout `gate_placements` when this row was created from the sketch. */
  sketchPlacementIndex?: number;
}

type ChainGateRow = {
  id: string;
  width_in: string;
  posts: FmsPvcGatePosts;
  opening_in: string;
  sketchPlacementIndex?: number;
};

function parseSketchPlacementIndex(o: Record<string, unknown>): number | undefined {
  const n = Number(o.sketchPlacementIndex);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return undefined;
}

function shiftGatePlacementIndices<T extends { sketchPlacementIndex?: number }>(
  rows: T[],
  removedIndex: number
): T[] {
  return rows
    .filter((r) => r.sketchPlacementIndex !== removedIndex)
    .map((r) => {
      const idx = r.sketchPlacementIndex;
      if (idx == null || idx < removedIndex) return r;
      return { ...r, sketchPlacementIndex: idx - 1 };
    });
}

function presetToExcel(preset: LineEndPreset, h: 0 | 1 | 2, uStr: string): { d6: 0 | 1 | 2; d7: number } {
  // A standalone run needs a post at each end, so a P-panel run = P + 1 posts (D6 = 2).
  if (preset === 'h_continuous') return { d6: 2, d7: 0 };
  // One end butts to a wall / U-channel, so only the far end adds a post (D6 = 1).
  if (preset === 'u_at_end') return { d6: 1, d7: 1 };
  const d7 = Math.max(0, Number(uStr) || 0);
  return { d6: h, d7: d7 };
}

function d6d7FromRunEnds(ends: SegmentRunEnds): { d6: 0 | 1 | 2; d7: number } {
  const d6 = Math.min(
    2,
    (ends.start.h_post ? 1 : 0) + (ends.end.h_post ? 1 : 0)
  ) as 0 | 1 | 2;
  const d7 = (ends.start.u_channel ? 1 : 0) + (ends.end.u_channel ? 1 : 0);
  return { d6, d7 };
}

function runEndsFromD6D7(d6: 0 | 1 | 2, d7: number): SegmentRunEnds {
  if (d6 === 2 && d7 === 0) {
    return {
      start: { h_post: true, u_channel: false },
      end: { h_post: true, u_channel: false },
    };
  }
  if (d6 === 1 && d7 === 1) {
    return {
      start: { h_post: false, u_channel: true },
      end: { h_post: true, u_channel: false },
    };
  }
  if (d6 === 1 && d7 === 0) {
    return {
      start: { h_post: false, u_channel: false },
      end: { h_post: true, u_channel: false },
    };
  }
  return {
    start: { h_post: d6 >= 2, u_channel: d7 >= 2 },
    end: { h_post: d6 >= 1, u_channel: d7 >= 1 },
  };
}

function runEndsFromLegacyRow(row: PvcLineRow): SegmentRunEnds {
  const { d6, d7 } = presetToExcel(row.end_preset, row.h_post_type, row.u_channel);
  return runEndsFromD6D7(d6, d7);
}

function effectiveRunEnds(row: PvcLineRow): SegmentRunEnds {
  return row.run_ends ?? runEndsFromLegacyRow(row);
}

function runEndsFromHybridRow(row: HybridLineRow): SegmentRunEnds {
  return runEndsFromD6D7(row.h_post, row.u_channel);
}

function effectiveHybridRunEnds(row: HybridLineRow): SegmentRunEnds {
  return row.run_ends ?? runEndsFromHybridRow(row);
}

function runEndsFromChainRow(row: ChainLineRow): SegmentRunEnds {
  const d6 = Math.max(0, Math.min(2, Math.round(Number(row.terminal_post) || 0))) as 0 | 1 | 2;
  return runEndsFromD6D7(d6, 0);
}

function effectiveChainRunEnds(row: ChainLineRow): SegmentRunEnds {
  return row.run_ends ?? runEndsFromChainRow(row);
}

function runEndsSummary(ends: SegmentRunEnds): string {
  const fmt = (label: string, t: { h_post: boolean; u_channel: boolean }) => {
    if (!t.h_post && !t.u_channel) return `${label}: open`;
    const bits: string[] = [];
    if (t.h_post) bits.push('End post');
    if (t.u_channel) bits.push('Wall channel');
    return `${label}: ${bits.join(' + ')}`;
  };
  return `${fmt('Start', ends.start)} · ${fmt('End', ends.end)}`;
}

function pvcGateLabelFromWidth(w: number): string {
  if (w <= 0) return 'Gate';
  if (w < PVC_SHORT_GATE_MAX_IN) return 'Walk gate';
  if (w >= PVC_DOUBLE_GATE_MIN_IN) return 'Double gate';
  if (w >= PVC_SINGLE_GATE_MIN_IN) return 'Single gate';
  return 'Walk gate';
}

function parseRunEnds(raw: unknown): SegmentRunEnds | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const side = (key: 'start' | 'end') => {
    const s = o[key];
    if (!s || typeof s !== 'object') return undefined;
    const q = s as Record<string, unknown>;
    return { h_post: q.h_post !== false, u_channel: q.u_channel === true };
  };
  const start = side('start');
  const end = side('end');
  if (!start || !end) return undefined;
  return { start, end };
}

function parsePanelSpacingFt(raw: string, module: FmsPvcPanelModule): number {
  const n = Number(String(raw).replace(/,/g, '').trim());
  if (Number.isFinite(n) && n > 0) return n;
  return defaultFmsPvcPanelSpacingFt(module);
}

function formatPvcPanelSummary(module: FmsPvcPanelModule, spacingFt: number): string {
  const spacing =
    Number.isFinite(spacingFt) && spacingFt > 0 ? spacingFt : defaultFmsPvcPanelSpacingFt(module);
  return `${FMS_PVC_PANEL_HEIGHT_LABELS[module]} (${spacing.toFixed(2)}' spacing)`;
}

/** Same inclusion rule as `buildInputs` / `aggregateFmsPvcFenceLines`. */
function pvcLineIncludedInInputs(row: PvcLineRow, calcLengthFt?: number): boolean {
  const L =
    calcLengthFt ?? Math.max(0, Number(String(row.length_ft).replace(/,/g, '')) || 0);
  const { d6, d7 } = row.run_ends
    ? d6d7FromRunEnds(row.run_ends)
    : presetToExcel(row.end_preset, row.h_post_type, row.u_channel);
  return L > 0 || d6 > 0 || d7 > 0;
}

function adobeGateMapToBreakdownCols(adobe: FmsPvcAdobeGateMap) {
  return {
    h_post: adobe[19] ?? 0,
    u_channel: adobe[28] ?? 0,
    rail: adobe[21] ?? 0,
    board: adobe[23] ?? 0,
  };
}

type PvcRunBreakdownRow =
  | {
      kind: 'fence';
      id: string;
      label: string;
      length_ft: number;
      panelLabel: string;
      panels: number;
      h_post: number;
      u_channel: number;
      rail: number;
      board: number;
      hasGate?: boolean;
      sketchPlacementIndex?: number;
    }
  | {
      kind: 'gate';
      id: string;
      label: string;
      gateKind: 'short' | 'single' | 'double';
      length_ft: number;
      panelLabel: string;
      h_post: number;
      u_channel: number;
      rail: number;
      board: number;
      hasGate?: boolean;
      sketchPlacementIndex?: number;
    };

function pvcGateBreakdownFromRow(
  gateKind: 'short' | 'single' | 'double',
  row: PvcGateRow,
  label: string,
  recipe?: FmsCalculatorRecipeV1 | null
): PvcRunBreakdownRow | null {
  const w = Math.max(0, Number(String(row.width_in).replace(/,/g, '')) || 0);
  if (w <= 0) return null;
  const panelLabel =
    gateKind === 'short' ? 'Walk gate' : gateKind === 'single' ? 'Single gate' : 'Double gate';
  const input = { gate_width_in: w, posts: FMS_GATE_POST_COUNT };
  const adobe =
    gateKind === 'short'
      ? computeFmsPvcShortGate(input, recipe).adobe_gate_rows
      : gateKind === 'single'
        ? computeFmsPvcSingleGate(input, recipe).adobe_gate_rows
        : computeFmsPvcDoubleGate(input, recipe).adobe_gate_rows;
  const cols = adobeGateMapToBreakdownCols(adobe);
  return {
    kind: 'gate',
    id: row.id,
    label,
    gateKind,
    length_ft: Math.round((w / 12) * 100) / 100,
    panelLabel,
    sketchPlacementIndex: row.sketchPlacementIndex,
    ...cols,
  };
}

function buildPvcGateBreakdownRows(
  gateKind: 'short' | 'single' | 'double',
  rows: PvcGateRow[],
  labelPrefix: string,
  recipe?: FmsCalculatorRecipeV1 | null
): PvcRunBreakdownRow[] {
  const out: PvcRunBreakdownRow[] = [];
  let n = 0;
  for (const row of rows) {
    const w = Math.max(0, Number(String(row.width_in).replace(/,/g, '')) || 0);
    if (w <= 0) continue;
    n += 1;
    const built = pvcGateBreakdownFromRow(gateKind, row, `${labelPrefix} ${n} (${w}″)`, recipe);
    if (built) out.push(built);
  }
  return out;
}

function segmentIndexForGateRow(
  gate: PvcRunBreakdownRow,
  placements: { line_index: number }[] | undefined
): number | null {
  const pi = gate.sketchPlacementIndex;
  if (pi == null || !placements?.length || pi < 0 || pi >= placements.length) return null;
  const idx = Math.floor(Number(placements[pi].line_index));
  return Number.isFinite(idx) && idx >= 0 ? idx : null;
}

function buildInputForPvcLineRow(
  r: PvcLineRow,
  panelSpacingFt: number,
  sketchCtx?: { segmentIndex: number; sketch: LayoutSketchDrawingPayload },
  effectiveTerm?: { d6: 0 | 1 | 2; d7: number }
): FmsPvcFenceLineInput | null {
  const grossL = Math.max(0, Number(String(r.length_ft).replace(/,/g, '')) || 0);
  if (
    sketchCtx &&
    sketchGateSegmentRole(
      sketchCtx.segmentIndex,
      sketchCtx.sketch.gate_placements,
      sketchCtx.sketch.segments.length,
      sketchCtx.sketch.segments
    ) === 'gate'
  ) {
    return null;
  }
  const calcL = sketchCtx
    ? fenceCalcLengthFtForSketchFenceRun(sketchCtx.segmentIndex, grossL, sketchCtx.sketch)
    : grossL;
  let d6: 0 | 1 | 2;
  let d7: number;
  if (effectiveTerm) {
    ({ d6, d7 } = effectiveTerm);
  } else if (r.run_ends) {
    ({ d6, d7 } = d6d7FromRunEnds(r.run_ends));
  } else {
    ({ d6, d7 } = presetToExcel(r.end_preset, r.h_post_type, r.u_channel));
  }
  if (!pvcLineIncludedInInputs(r, calcL)) return null;
  const spacing = Number.isFinite(panelSpacingFt) && panelSpacingFt > 0 ? panelSpacingFt : undefined;
  return {
    length_ft: calcL,
    fence_terminated_h_post_type: (calcL <= 0 ? 0 : d6) as 0 | 1 | 2,
    fence_terminated_u_channel: d7,
    panel_module: r.panel_module,
    ...(spacing ? { panel_spacing_ft: spacing } : {}),
  };
}

/** Same inclusion rule as PVC fence lines. */
function hybridLineIncludedInInputs(row: HybridLineRow, calcLengthFt?: number): boolean {
  const L = calcLengthFt ?? Math.max(0, Number(String(row.length_ft).replace(/,/g, '')) || 0);
  const { d6, d7 } = row.run_ends
    ? d6d7FromRunEnds(row.run_ends)
    : { d6: row.h_post, d7: row.u_channel };
  return L > 0 || d6 > 0 || d7 > 0;
}

/** Mirror `buildInputForPvcLineRow` — sketch length/post rules; hybrid material math is separate. */
function buildInputForHybridLineRow(
  r: HybridLineRow,
  sketchCtx?: { segmentIndex: number; sketch: LayoutSketchDrawingPayload },
  effectiveTerm?: { d6: 0 | 1 | 2; d7: number }
): { length_ft: number; h_post: 0 | 1 | 2; u_channel: 0 | 1 | 2 } | null {
  const grossL = Math.max(0, Number(String(r.length_ft).replace(/,/g, '')) || 0);
  if (
    sketchCtx &&
    sketchGateSegmentRole(
      sketchCtx.segmentIndex,
      sketchCtx.sketch.gate_placements,
      sketchCtx.sketch.segments.length,
      sketchCtx.sketch.segments
    ) === 'gate'
  ) {
    return null;
  }
  const calcL = sketchCtx
    ? fenceCalcLengthFtForSketchFenceRun(sketchCtx.segmentIndex, grossL, sketchCtx.sketch)
    : grossL;
  let h_post: 0 | 1 | 2;
  let u_channel: number;
  if (effectiveTerm) {
    h_post = effectiveTerm.d6;
    u_channel = effectiveTerm.d7;
  } else if (r.run_ends) {
    ({ d6: h_post, d7: u_channel } = d6d7FromRunEnds(r.run_ends));
  } else {
    h_post = r.h_post;
    u_channel = r.u_channel;
  }
  if (!hybridLineIncludedInInputs(r, calcL)) return null;
  return {
    length_ft: calcL,
    h_post: (calcL <= 0 ? 0 : h_post) as 0 | 1 | 2,
    u_channel: Math.max(0, Math.min(2, Math.round(u_channel))) as 0 | 1 | 2,
  };
}

function buildInputs(
  rows: PvcLineRow[],
  panelSpacingFt: number,
  sketch?: LayoutSketchDrawingPayload | null
): FmsPvcFenceLineInput[] {
  const runEnds = rows.map((r) => effectiveRunEnds(r));
  const effective = resolveJobRunTerminations(runEnds, sketch);
  return rows
    .map((r, i) =>
      buildInputForPvcLineRow(
        r,
        panelSpacingFt,
        sketch?.segments?.length ? { segmentIndex: i, sketch } : undefined,
        effective[i]
      )
    )
    .filter(Boolean) as FmsPvcFenceLineInput[];
}

function defaultPvcGateWidthIn(kind: 'short' | 'single' | 'double'): string {
  if (kind === 'double') return String(PVC_DOUBLE_GATE_MIN_IN);
  return String(PVC_STANDARD_GATE_WIDTH_IN);
}

function emptyGateRow(kind: 'short' | 'single' | 'double'): PvcGateRow {
  return { id: newLineId(), width_in: defaultPvcGateWidthIn(kind), posts: FMS_GATE_POST_COUNT };
}

/**
 * Row `length_ft` is gross (full run including any gate opening on that segment).
 * Fence panel math subtracts gate width — use this for calculator inputs.
 */
function fenceCalcLengthFtForSketchSegment(
  segmentIndex: number,
  grossLengthFt: number,
  sketch: LayoutSketchDrawingPayload | null | undefined
): number {
  return fenceCalcLengthFtForSketchFenceRun(segmentIndex, grossLengthFt, sketch);
}

/** Subtract manually added hybrid gates (no sketch placement) from a single fence run. */
function subtractManualHybridGateWidthFt(
  segmentIndex: number,
  lengthFt: number,
  lineCount: number,
  hybGates: { sketchPlacementIndex?: number; width_in: string }[],
  hasSketchGatePlacements: boolean
): number {
  if (hasSketchGatePlacements) return lengthFt;
  let subtractIn = 0;
  for (const g of hybGates) {
    if (g.sketchPlacementIndex != null) continue;
    const w = Number(String(g.width_in).replace(/,/g, ''));
    if (!Number.isFinite(w) || w <= 0) continue;
    subtractIn += w;
  }
  if (subtractIn <= 0) return lengthFt;
  if (lineCount === 1 && segmentIndex === 0) {
    return Math.max(0, Math.round((lengthFt - subtractIn / 12) * 100) / 100);
  }
  return lengthFt;
}

function pvcGateFromSketchPlacement(
  placement: SketchGatePlacement,
  segments: { length_ft: number }[]
): { kind: 'short' | 'single' | 'double'; row: PvcGateRow } {
  const widthRaw = sketchGateWidthInches(placement, segments);
  const wStr = (n: number) => String(Math.round(n * 100) / 100);

  if (widthRaw > 0 && widthRaw < 59.5) {
    return { kind: 'short', row: { id: newLineId(), width_in: wStr(widthRaw), posts: FMS_GATE_POST_COUNT } };
  }
  if (placement.type === 'double') {
    return { kind: 'double', row: { id: newLineId(), width_in: wStr(widthRaw), posts: FMS_GATE_POST_COUNT } };
  }
  return { kind: 'single', row: { id: newLineId(), width_in: wStr(widthRaw), posts: FMS_GATE_POST_COUNT } };
}

function chainGateRowFromSketchPlacement(
  placement: { type: 'single' | 'double'; line_index: number },
  segments: { length_ft: number }[]
): { id: string; width_in: string; posts: FmsPvcGatePosts; opening_in: string } {
  const { row } = pvcGateFromSketchPlacement(placement, segments);
  return { id: newLineId(), width_in: row.width_in, posts: row.posts, opening_in: '45' };
}

function hybridFenceGateFromSketchPlacement(
  placement: { type: 'single' | 'double'; line_index: number },
  segments: { length_ft: number }[]
): HybridHFenceGateRow {
  const { row } = pvcGateFromSketchPlacement(placement, segments);
  return { ...row, adjoining: 0 as const };
}

function parseGateRowsShort(rows: PvcGateRow[]) {
  return rows
    .map((r) => {
      const w = Math.max(0, Number(String(r.width_in).replace(/,/g, '')) || 0);
      if (w <= 0) return null;
      return { gate_width_in: w, posts: FMS_GATE_POST_COUNT };
    })
    .filter(Boolean) as { gate_width_in: number; posts: FmsPvcGatePosts }[];
}

/** Route gates to the correct PVC workbook block by opening width (matches Excel sections). */
function classifyPvcGateInputs(
  shortRows: PvcGateRow[],
  singleRows: PvcGateRow[],
  doubleRows: PvcGateRow[]
): {
  short: { gate_width_in: number; posts: FmsPvcGatePosts }[];
  single: { gate_width_in: number; posts: FmsPvcGatePosts }[];
  double: { gate_width_in: number; posts: FmsPvcGatePosts }[];
} {
  const short: { gate_width_in: number; posts: FmsPvcGatePosts }[] = [];
  const single: { gate_width_in: number; posts: FmsPvcGatePosts }[] = [];
  const double: { gate_width_in: number; posts: FmsPvcGatePosts }[] = [];

  const push = (r: PvcGateRow, preferred: 'short' | 'single' | 'double') => {
    const w = Math.max(0, Number(String(r.width_in).replace(/,/g, '')) || 0);
    if (w <= 0) return;
    const item = { gate_width_in: w, posts: FMS_GATE_POST_COUNT };
    if (w < PVC_SHORT_GATE_MAX_IN) short.push(item);
    else if (w >= PVC_DOUBLE_GATE_MIN_IN && preferred === 'double') double.push(item);
    else if (w >= PVC_SINGLE_GATE_MIN_IN) single.push(item);
    else short.push(item);
  };

  for (const r of shortRows) push(r, 'short');
  for (const r of singleRows) push(r, 'single');
  for (const r of doubleRows) push(r, 'double');
  return { short, single, double };
}

type MasterExtraGroup =
  | { label: string; keys: (keyof FmsPvcMasterExtras)[]; mode: 'same' }
  | {
      label: string;
      keys: (keyof FmsPvcMasterExtras)[];
      mode: 'board_stiffener_ratio';
      boardsKey: keyof FmsPvcMasterExtras;
      stiffKey: keyof FmsPvcMasterExtras;
    };

const MASTER_EXTRA_GROUPS: MasterExtraGroup[] = [
  { label: 'Rail (+ stiffener)', keys: ['m6', 'm7'], mode: 'same' },
  {
    label: 'Board (+ stiffener)',
    keys: ['m8', 'm9'],
    mode: 'board_stiffener_ratio',
    boardsKey: 'm8',
    stiffKey: 'm9',
  },
  { label: 'H-post (+ galvanized)', keys: ['m10', 'm11'], mode: 'same' },
];

const MASTER_EXTRA_SOLO: { key: keyof FmsPvcMasterExtras; label: string; integerOnly?: boolean }[] = [
  { key: 'm12', label: 'U-channel' },
  { key: 'm13', label: 'H-post stiffener' },
  { key: 'm14', label: 'Post filler', integerOnly: true },
  { key: 'm15', label: 'Overhead brace', integerOnly: true },
  { key: 'm16', label: 'Diagonal / cross brace', integerOnly: true },
  { key: 'm19', label: 'Post cap' },
  { key: 'm20', label: 'Hole plug' },
  { key: 'm21', label: 'Large screw' },
  { key: 'm22', label: 'Short screw' },
  { key: 'm23', label: 'Latch' },
  { key: 'm24', label: 'Hinge' },
];

const MASTER_EXTRA_KEYS: (keyof FmsPvcMasterExtras)[] = [
  ...MASTER_EXTRA_GROUPS.flatMap((g) => g.keys),
  ...MASTER_EXTRA_SOLO.map((s) => s.key),
];

function groupedExtraDisplayValue(
  group: MasterExtraGroup,
  extras: Partial<Record<keyof FmsPvcMasterExtras, string>>
): string {
  if (group.mode === 'board_stiffener_ratio') {
    return extras[group.boardsKey] ?? '';
  }
  for (const k of group.keys) {
    const v = extras[k];
    if (v != null && v !== '') return v;
  }
  return '';
}

function applyGroupedExtraChange(
  group: MasterExtraGroup,
  raw: string,
  prev: Partial<Record<keyof FmsPvcMasterExtras, string>>,
  boardsPerPack = 16,
  stiffenersPerPack = 3
): Partial<Record<keyof FmsPvcMasterExtras, string>> {
  const next = { ...prev };
  const v = sanitizeExtraInput(raw, false);
  if (v === '') {
    for (const k of group.keys) delete next[k];
    return next;
  }
  if (group.mode === 'board_stiffener_ratio') {
    next[group.boardsKey] = v;
    const boards = Number(v.replace(/,/g, ''));
    if (Number.isFinite(boards) && boards > 0) {
      next[group.stiffKey] = String(boardStiffenersForBoardCount(boards, boardsPerPack, stiffenersPerPack));
    } else {
      delete next[group.stiffKey];
    }
    return next;
  }
  for (const k of group.keys) next[k] = v;
  return next;
}

function sanitizeExtraInput(raw: string, integerOnly: boolean): string {
  if (raw === '') return '';
  if (integerOnly) return raw.replace(/[^\d]/g, '');
  return raw.replace(/[^\d.,]/g, '');
}

/* ---- Extra items for the non-PVC styles ---- */

type StyleExtraDef = {
  key: string;
  label: string;
  integerOnly?: boolean;
  /** Master-list rows this extra feeds (hybrids); `per` = added per unit of the input. */
  targets?: { item: string; per: number }[];
};

const CHAIN_EXTRA_ITEMS: StyleExtraDef[] = [
  { key: 'terminal_post', label: 'Terminal post', integerOnly: true },
  { key: 'line_post', label: 'Line post', integerOnly: true },
  { key: 'terminal_post_cap', label: 'Terminal post cap', integerOnly: true },
  { key: 'line_post_loop_cap', label: 'Line post loop cap', integerOnly: true },
  { key: 'rail_end', label: 'Rail end', integerOnly: true },
  { key: 'rail', label: 'Rail', integerOnly: true },
  { key: 'center_band', label: 'Center band', integerOnly: true },
  { key: 'offset_band', label: 'Offset band', integerOnly: true },
  { key: 'tension_bar', label: 'Tension bar', integerOnly: true },
  { key: 'mesh', label: 'Mesh (rolls)', integerOnly: true },
  { key: 'bottom_wire', label: 'Bottom wire (ft)' },
  { key: 'ties', label: 'Ties', integerOnly: true },
  { key: 'carriage_bolt_nut', label: 'Carriage bolt + nut', integerOnly: true },
  { key: 'hog_rings', label: 'Hog rings', integerOnly: true },
  { key: 'gate_frame', label: 'Gate frame', integerOnly: true },
  { key: 'gate_post', label: 'Gate post', integerOnly: true },
  { key: 'gate_end_post_cap', label: 'Gate end post cap', integerOnly: true },
  { key: 'gate_extension_kit', label: 'Gate extension kit', integerOnly: true },
  { key: 'gate_hardware_kit', label: 'Gate hardware kit', integerOnly: true },
];

const HYBRID_EXTRA_ITEMS_COMMON: StyleExtraDef[] = [
  {
    key: 'hpost',
    label: 'H-post (+ cap & concrete)',
    integerOnly: true,
    targets: [
      { item: 'Aluminum HPost 120"', per: 1 },
      { item: 'Aluminum HPost Cap', per: 1 },
      { item: 'Concrete', per: 2.5 },
    ],
  },
  { key: 'rail96', label: '3" Aluminum Pocket Rail 96"', integerOnly: true, targets: [{ item: '3" Aluminum Pocket Rail 96"', per: 1 }] },
  { key: 'rail72', label: '3" Aluminum Pocket Rail 72"', integerOnly: true, targets: [{ item: '3" Aluminum Pocket Rail 72"', per: 1 }] },
  { key: 'board', label: 'Board', integerOnly: true, targets: [{ item: 'Board', per: 1 }] },
  {
    key: 'uchannel',
    label: 'U-channel (outer + inner + screws)',
    integerOnly: true,
    targets: [
      { item: 'Outer U-Channel', per: 1 },
      { item: 'Inner U-Channel', per: 1 },
      { item: 'U-Channel Screw (3/4")', per: 6 },
    ],
  },
  { key: 'long_screw', label: 'Long Black Screw (2.5")', integerOnly: true, targets: [{ item: 'Long Black Screw (2.5")', per: 1 }] },
  {
    key: 'rail_screw',
    label: 'Rail Screw 1.5" (+ plugs)',
    integerOnly: true,
    targets: [
      { item: 'Rail Screw (1.5" x #10)', per: 1 },
      { item: 'Plugs (7/8")', per: 1 },
    ],
  },
  { key: 'gate_screw', label: 'Gate Screw (1.5")', integerOnly: true, targets: [{ item: 'Gate Screw (1.5")', per: 1 }] },
  { key: 'gate_side_frame', label: 'Gate Side Frame', integerOnly: true, targets: [{ item: 'Aluminum Gate Side Frame', per: 1 }] },
  { key: 'gate_post_cap', label: 'Gate Post Cap', integerOnly: true, targets: [{ item: 'Aluminum Gate Post Cap', per: 1 }] },
  { key: 'gate_brace', label: 'Adjustable Gate Brace', integerOnly: true, targets: [{ item: 'Adjustable Aluminum Gate Brace', per: 1 }] },
  { key: 'latch', label: 'Latch Kit', integerOnly: true, targets: [{ item: 'Latch Kit', per: 1 }] },
  { key: 'hinge', label: 'Hinge Kit', integerOnly: true, targets: [{ item: 'Hinge Kit', per: 1 }] },
];

const HYBRID_H_EXTRA_ITEMS: StyleExtraDef[] = HYBRID_EXTRA_ITEMS_COMMON;

const HYBRID_V_EXTRA_ITEMS: StyleExtraDef[] = [
  ...HYBRID_EXTRA_ITEMS_COMMON.slice(0, 4),
  { key: 'board_stiff', label: 'Board Stiffener', integerOnly: true, targets: [{ item: 'Board Stiffener', per: 1 }] },
  ...HYBRID_EXTRA_ITEMS_COMMON.slice(4),
  { key: 'drop_rod', label: 'Drop Rod + Sleeve', integerOnly: true, targets: [{ item: 'Drop Rod + Sleeve', per: 1 }] },
];

function styleExtraValue(values: Record<string, string>, key: string): number {
  const n = Number(String(values[key] ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Add hybrid extras onto the master SKU rows (matching rows by label, appending new ones). */
function applyHybridExtras(
  rows: FmsHybridItemRow[],
  defs: StyleExtraDef[],
  values: Record<string, string>
): FmsHybridItemRow[] {
  const out = rows.map((r) => ({ ...r }));
  for (const def of defs) {
    const v = styleExtraValue(values, def.key);
    if (v <= 0 || !def.targets) continue;
    for (const t of def.targets) {
      const existing = out.find((r) => r.item.toLowerCase() === t.item.toLowerCase());
      if (existing) existing.final += v * t.per;
      else out.push({ item: t.item, final: v * t.per });
    }
  }
  return out;
}

function StyleExtrasCard({
  items,
  values,
  onChange,
}: {
  items: StyleExtraDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const hasAny = items.some((i) => (values[i.key] ?? '') !== '');
  const [open, setOpen] = useState(hasAny);
  useEffect(() => {
    if (hasAny) setOpen(true);
  }, [hasAny]);
  return (
    <section className={card}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className={h2}>
          Extra items <span className="font-normal text-slate-400">(optional)</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Add extra quantities on top of the calculated list. Leave blank to skip.
        </p>
      </div>
      <div className="p-5">
        <button type="button" className={btnGhost} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide extra items' : 'Add extra items'}
        </button>
        {open && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((i) => (
              <div key={i.key}>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">{i.label}</label>
                <input
                  type="text"
                  inputMode={i.integerOnly ? 'numeric' : 'decimal'}
                  value={values[i.key] ?? ''}
                  onChange={(e) => onChange(i.key, sanitizeExtraInput(e.target.value, Boolean(i.integerOnly)))}
                  className={`${field} w-full`}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function parseStringRecord(x: unknown): Record<string, string> | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = String(v);
  }
  return Object.keys(out).length ? out : null;
}

const MATERIAL_CALC_DRAFT_VERSION = 1 as const;

function materialCalculatorDraftStorageKey(contractorId: string) {
  return `qmf_material_calculator_draft_v${MATERIAL_CALC_DRAFT_VERSION}_${contractorId}`;
}

function defaultPvcLines(): PvcLineRow[] {
  return [
    {
      id: newLineId(),
      label: 'Line 1',
      length_ft: '',
      panel_module: 'nominal_7ft',
      end_preset: 'h_continuous',
      h_post_type: 1,
      u_channel: '0',
    },
  ];
}

function defaultChainLines(): ChainLineRow[] {
  return [{ id: newLineId(), label: 'Run 1', length_ft: '', terminal_post: '2' }];
}

/** Excel rows 10–12 info text for one chain link run ("Total Fence Line Panels" → "Posts"). */
function chainRunInfoText(lengthFt: string): string | null {
  const L = Math.max(0, Number(String(lengthFt).replace(/,/g, '')) || 0);
  if (L <= 0) return null;
  const r = computeFmsChainLinkFenceLine({
    length_ft: L,
    terminal_post_type: 2,
    rail_length_ft: 10,
    mesh_roll_ft: 50,
    ties_per_bag: 100,
  });
  return `Panels ${r.total_panels} → whole ${r.whole_panels} · Posts ${r.posts}`;
}

/** Standalone run = post at each end (D6 = 2), same default as the PVC tab. */
function defaultHybridLines(): HybridLineRow[] {
  return [{ id: newLineId(), label: 'Run 1', length_ft: '', h_post: 2, u_channel: 0 }];
}

function coerceStyleTab(x: unknown): StyleTab {
  if (x === 'hybrid' || x === 'hybrid_h' || x === 'hybrid-horizontal') return 'hybrid_h';
  if (x === 'hybrid_v' || x === 'hybrid-vertical') return 'hybrid_v';
  return x === 'chain' || x === 'pvc' ? x : 'pvc';
}

function isStyleTabParam(x: string): boolean {
  return ['pvc', 'chain', 'hybrid', 'hybrid_h', 'hybrid_v', 'hybrid-horizontal', 'hybrid-vertical'].includes(x);
}

function coerceHybridHoHeight(x: unknown): FmsHybridHoHeight {
  return Number(x) === 7 ? 7 : 6;
}

function coerceHybridMaterialLine(x: unknown): FmsHybridMaterialLine {
  return x === 'pvc' ? 'pvc' : 'wpc';
}

function hybridHExportColour(board: FmsHybridHoBoardMaterial, colour: string): string {
  const line = fmsHybridHoBoardMaterialColourLine(board);
  if (!line) return 'Aluminum (horizontal)';
  return fmsHybridColourExportLabel('horizontal', line, colour);
}

function HybridColourSelect({
  material,
  value,
  onChange,
  className,
}: {
  material: FmsHybridMaterialLine;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {fmsHybridColoursForMaterial(material).map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function coerceLineEndPreset(x: unknown): LineEndPreset {
  return x === 'h_continuous' || x === 'u_at_end' || x === 'custom' ? x : 'h_continuous';
}

function coercePanelModule(x: unknown): FmsPvcPanelModule {
  return x === 'nominal_6ft' || x === 'nominal_7ft' ? x : 'nominal_7ft';
}

function coerceH012(x: unknown): 0 | 1 | 2 {
  const n = Number(x);
  return n === 0 || n === 1 || n === 2 ? n : 1;
}

function coerce012Default0(x: unknown): 0 | 1 | 2 {
  const n = Number(x);
  return n === 0 || n === 1 || n === 2 ? n : 0;
}

function parsePvcLines(raw: unknown): PvcLineRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PvcLineRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      label: typeof o.label === 'string' ? o.label : `Line ${out.length + 1}`,
      length_ft: typeof o.length_ft === 'string' || typeof o.length_ft === 'number' ? String(o.length_ft) : '',
      panel_module: coercePanelModule(o.panel_module),
      end_preset: coerceLineEndPreset(o.end_preset),
      h_post_type: coerceH012(o.h_post_type),
      u_channel: typeof o.u_channel === 'string' || typeof o.u_channel === 'number' ? String(o.u_channel) : '0',
      fromSketch: o.fromSketch === true,
      manualRunEdit: o.manualRunEdit === true,
      ...((): { run_ends?: SegmentRunEnds } => {
        const run_ends = parseRunEnds(o.run_ends);
        return run_ends ? { run_ends } : {};
      })(),
    });
  }
  return out.length ? out : null;
}

function parseLayoutSketch(raw: unknown): LayoutSketchDrawingPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const points = Array.isArray(o.points) ? o.points.filter((p) => p && typeof p === 'object') : [];
  const pts = points.map((p) => {
    const q = p as Record<string, unknown>;
    return { x: Number(q.x) || 0, y: Number(q.y) || 0 };
  });
  const segsRaw = Array.isArray(o.segments) ? o.segments : [];
  const segments = segsRaw.map((s) => {
    const q = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
    const lf = q.length_ft;
    const n = typeof lf === 'number' ? lf : Number(lf);
    return { length_ft: Number.isFinite(n) && n > 0 ? n : 0 };
  });
  const gatesRaw = Array.isArray(o.gates) ? o.gates : [];
  const gates = gatesRaw
    .map((g) => {
      const q = g && typeof g === 'object' ? (g as Record<string, unknown>) : {};
      const type = q.type === 'double' ? 'double' : 'single';
      const qty = Math.max(0, Math.floor(Number(q.quantity) || 0));
      return { type: type as 'single' | 'double', quantity: qty };
    })
    .filter((g) => g.quantity > 0);
  const gpRaw = Array.isArray(o.gate_placements) ? o.gate_placements : [];
  const gate_placements = gpRaw
    .map((row) => {
      const q = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      const type = q.type === 'double' ? 'double' : 'single';
      const line_index = Math.max(0, Math.floor(Number(q.line_index) || 0));
      const x = Number(q.x);
      const y = Number(q.y);
      const width_in = Number(q.width_in);
      const left_ft = Number(q.left_ft);
      return {
        type: type as 'single' | 'double',
        line_index,
        ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
        ...(Number.isFinite(width_in) && width_in > 0 ? { width_in } : {}),
        ...(Number.isFinite(left_ft) ? { left_ft } : {}),
      };
    })
    .filter((_, i) => i < 500);
  const jtRaw = Array.isArray(o.joint_terminations) ? o.joint_terminations : null;
  let joint_terminations: SketchJointTermination[] | undefined;
  if (jtRaw && segments.length > 0) {
    const pairs = layoutPointsToSegmentPairs(pts, segments);
    if (pairs.length === segments.length) {
      const lengthPerSeg = segments.map((s, i) => {
        const n = Number(s.length_ft);
        const pair = pairs[i];
        if (Number.isFinite(n) && n > 0) return n;
        if (pair && pair.length >= 2) return Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
        return 0;
      });
      const al = alignChainedSketchSegments(
        pairs,
        lengthPerSeg,
        LAYOUT_CHAIN_ALIGN_FT,
        LAYOUT_MIN_SKETCH_SEGMENT_FT
      );
      const expectedJointCount = jointPositionsFromAligned(al, LAYOUT_CHAIN_ALIGN_FT).length;
      if (jtRaw.length === expectedJointCount) {
        joint_terminations = jtRaw.map((row) => {
          const q = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          return {
            h_post: q.h_post !== false,
            u_channel: q.u_channel === true,
          };
        });
      }
    }
  }
  const total = Number(o.total_length_ft);
  const total_length_ft = Number.isFinite(total) ? total : 0;
  if (pts.length === 0 && segments.length === 0 && gates.length === 0 && gate_placements.length === 0) return null;
  return { points: pts, segments, gates, gate_placements, total_length_ft, ...(joint_terminations ? { joint_terminations } : {}) };
}

/** Saved layout drawing, or map segments + gates when no plan-view layout row exists. */
function layoutSketchFromMaterialQuoteProject(
  project: MaterialQuoteRequestDto['project'] | null | undefined
): LayoutSketchDrawingPayload | null {
  if (!project) return null;
  const fromLayout = parseLayoutSketch(project.drawing_data ?? null);
  if (fromLayout) return fromLayout;
  const segs = project.segments;
  if (!Array.isArray(segs) || segs.length === 0) return null;
  const totalFt = Number(project.total_length_ft) || 0;
  const dd = mapFenceSegmentsToLayoutDrawing(
    segs as MapFenceSegment[],
    totalFt,
    (project.gates ?? []) as MapFenceGate[]
  );
  return parseLayoutSketch(dd);
}

function parsePvcGateRows(raw: unknown): PvcGateRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PvcGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: FMS_GATE_POST_COUNT,
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    });
  }
  return out;
}

function parseChainLines(raw: unknown): ChainLineRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChainLineRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      label: typeof o.label === 'string' ? o.label : `Run ${out.length + 1}`,
      length_ft: typeof o.length_ft === 'string' || typeof o.length_ft === 'number' ? String(o.length_ft) : '',
      terminal_post:
        typeof o.terminal_post === 'string' || typeof o.terminal_post === 'number' ? String(o.terminal_post) : '2',
      fromSketch: o.fromSketch === true,
      manualRunEdit: o.manualRunEdit === true,
      ...((): { run_ends?: SegmentRunEnds } => {
        const run_ends = parseRunEnds(o.run_ends);
        return run_ends ? { run_ends } : {};
      })(),
    });
  }
  return out.length ? out : null;
}

function parseChainGates(raw: unknown): ChainGateRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChainGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: FMS_GATE_POST_COUNT,
      opening_in:
        typeof o.opening_in === 'string' || typeof o.opening_in === 'number' ? String(o.opening_in) : '45',
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    });
  }
  return out;
}

function parseHybridLines(raw: unknown): HybridLineRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HybridLineRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      label: typeof o.label === 'string' ? o.label : `Run ${out.length + 1}`,
      length_ft: typeof o.length_ft === 'string' || typeof o.length_ft === 'number' ? String(o.length_ft) : '',
      h_post: coerceH012(o.h_post),
      u_channel: coerce012Default0(o.u_channel),
      fromSketch: o.fromSketch === true,
      manualRunEdit: o.manualRunEdit === true,
      ...((): { run_ends?: SegmentRunEnds } => {
        const run_ends = parseRunEnds(o.run_ends);
        return run_ends ? { run_ends } : {};
      })(),
    });
  }
  return out.length ? out : null;
}

function parseHybridHFenceGateRows(raw: unknown): HybridHFenceGateRow[] {
  if (!Array.isArray(raw)) return [];
  const out: HybridHFenceGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: FMS_GATE_POST_COUNT,
      adjoining: coerceH012(o.adjoining ?? 0),
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    });
  }
  return out;
}

/** Migrate saved jobs that used the old single-list hybrid H gate format. */
function migrateLegacyHybridHGates(raw: unknown): {
  short: HybridHFenceGateRow[];
  single: HybridHFenceGateRow[];
  double: HybridHFenceGateRow[];
} | null {
  if (!Array.isArray(raw)) return null;
  const short: HybridHFenceGateRow[] = [];
  const single: HybridHFenceGateRow[] = [];
  const double: HybridHFenceGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const kind = o.kind === 'adjacent' || o.kind === 'double' ? o.kind : 'simple';
    const item: HybridHFenceGateRow = {
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: FMS_GATE_POST_COUNT,
      adjoining: coerceH012(o.adjoining ?? 0),
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    };
    if (kind === 'double') double.push(item);
    else if (kind === 'adjacent') single.push(item);
    else short.push(item);
  }
  return short.length || single.length || double.length ? { short, single, double } : null;
}

function parseMasterExtras(raw: unknown): Partial<Record<keyof FmsPvcMasterExtras, string>> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<keyof FmsPvcMasterExtras, string>> = {};
  for (const k of MASTER_EXTRA_KEYS) {
    const v = o[k];
    if (typeof v === 'string' || typeof v === 'number') out[k] = String(v);
  }
  return out;
}

export default function MaterialCalculatorHubPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const fromLayoutId = searchParams.get('from_layout');
  const materialRequestId = (searchParams.get('materialRequest') || '').trim();
  const fromMaterialQuoteId = (searchParams.get('from_material_quote') || '').trim();
  const fromMaterialSketchSaveId = (searchParams.get('from_material_sketch_save') || '').trim();
  const showSupplierMaterialRequest = Boolean(materialRequestId);

  const [tab, setTab] = useState<StyleTab>('pvc');
  const [jobAddress, setJobAddress] = useState('');
  const [importedMaterialRequest, setImportedMaterialRequest] = useState<MaterialQuoteRequestDto | null>(null);
  /** Matches the Excel per-colour breakdown tab (labels / TSV only; formulas shared). */
  const [pvcBreakdownColour, setPvcBreakdownColour] = useState<FmsPvcCalculatorColour>('Adobe');
  const [pvcPanelModule, setPvcPanelModule] = useState<FmsPvcPanelModule>('nominal_7ft');
  const [pvcPanelSpacingFt, setPvcPanelSpacingFt] = useState(() =>
    String(defaultFmsPvcPanelSpacingFt('nominal_7ft'))
  );
  const [lines, setLines] = useState<PvcLineRow[]>(() => defaultPvcLines());
  const [expandedFenceRuns, setExpandedFenceRuns] = useState<Record<string, boolean>>({});

  const [layoutSketchData, setLayoutSketchData] = useState<LayoutSketchDrawingPayload | null>(null);
  const layoutSketchDataRef = useRef<LayoutSketchDrawingPayload | null>(null);
  layoutSketchDataRef.current = layoutSketchData;
  const [layoutCanvasRemountKey, setLayoutCanvasRemountKey] = useState(0);
  /** Ignore canvas echo updates briefly after we push sketch geometry from run-table edits. */
  const programmaticSketchUpdateAtRef = useRef(0);

  const [shortGates, setShortGates] = useState<PvcGateRow[]>([]);
  const [singleGates, setSingleGates] = useState<PvcGateRow[]>([]);
  const [doubleGates, setDoubleGates] = useState<PvcGateRow[]>([]);
  /** How many sketch `gate_placements` we have already mirrored into PVC gate rows (append-only). */
  const sketchSyncedGatePlacementCountRef = useRef(0);
  const pvcGatesSectionRef = useRef<HTMLElement | null>(null);
  const chainGatesSectionRef = useRef<HTMLDivElement | null>(null);
  const [masterExtrasOpen, setMasterExtrasOpen] = useState(false);
  const [masterExtras, setMasterExtras] = useState<Partial<Record<keyof FmsPvcMasterExtras, string>>>({});
  /** Per-tab material labels excluded from order PDF / supplier quotes (customer already has them). */
  const [materialExclusions, setMaterialExclusions] = useState<MaterialExclusions>({});
  /** Percentage uplift applied to the final board count (e.g. "5" → +5% boards, rounded up). */
  const [extraBoardsPct, setExtraBoardsPct] = useState('');
  const [extraLargeScrewPct, setExtraLargeScrewPct] = useState('');
  const [extraShortScrewPct, setExtraShortScrewPct] = useState('');
  /** Extra items for the non-PVC styles (keyed per StyleExtraDef). */
  const [chainExtras, setChainExtras] = useState<Record<string, string>>({});
  const [hybHExtras, setHybHExtras] = useState<Record<string, string>>({});
  const [hybVExtras, setHybVExtras] = useState<Record<string, string>>({});

  /** Chain link */
  const [chainLines, setChainLines] = useState<ChainLineRow[]>(() => defaultChainLines());
  const [chainRailFt, setChainRailFt] = useState('10');
  const [chainMeshFt, setChainMeshFt] = useState('50');
  const [chainTiesPerBag, setChainTiesPerBag] = useState('100');
  const [chainGates, setChainGates] = useState<ChainGateRow[]>([]);

  const [accountType, setAccountType] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [fmsRecipe, setFmsRecipe] = useState<FmsCalculatorRecipeV1>(() => normalizeFmsCalculatorRecipe(null));
  const [fmsRecipeLoading, setFmsRecipeLoading] = useState(false);
  const [pvcHubMode, setPvcHubMode] = useState<'calculator' | 'setup'>('calculator');
  const isSupplierAccount = accountType === 'supplier';
  const canEditFmsRecipe = Boolean(userRole && ['owner', 'admin'].includes(userRole));

  const applyPvcPanelModule = useCallback((module: FmsPvcPanelModule) => {
    setPvcPanelModule(module);
    setPvcPanelSpacingFt(String(defaultFmsPvcPanelSpacingFt(module, fmsRecipe)));
    sketchToLinesSyncKeyRef.current = '';
    setLines((prev) => prev.map((l) => ({ ...l, panel_module: module })));
  }, [fmsRecipe]);

  /** Hybrid horizontal (Excel `Horizontal Material Calculator `). */
  const [hybHBoardMaterial, setHybHBoardMaterial] = useState<FmsHybridHoBoardMaterial>('wpcWoodGrain');
  const [hybHHeight, setHybHHeight] = useState<FmsHybridHoHeight>(6);
  const [hybHLines, setHybHLines] = useState<HybridLineRow[]>(() => defaultHybridLines());
  const [hybHShortGates, setHybHShortGates] = useState<HybridHFenceGateRow[]>([]);
  const [hybHSingleGates, setHybHSingleGates] = useState<HybridHFenceGateRow[]>([]);
  const [hybHDoubleGates, setHybHDoubleGates] = useState<HybridHFenceGateRow[]>([]);
  /** Hybrid vertical (Excel `Vertical Material Calculator - `). */
  const [hybVMaterial, setHybVMaterial] = useState<FmsHybridMaterialLine>('pvc');
  const [hybVLines, setHybVLines] = useState<HybridLineRow[]>(() => defaultHybridLines());
  const [hybVShortGates, setHybVShortGates] = useState<HybridVFenceGateRow[]>([]);
  const [hybVSingleGates, setHybVSingleGates] = useState<HybridVFenceGateRow[]>([]);
  const [hybVDoubleGates, setHybVDoubleGates] = useState<HybridVFenceGateRow[]>([]);
  const [hybridColour, setHybridColour] = useState('Ash');

  const hybHCalculatorFamily = useMemo(
    () => fmsHybridHoBoardMaterialCalculatorFamily(hybHBoardMaterial),
    [hybHBoardMaterial]
  );

  const hybridHHasColour = fmsHybridHoBoardMaterialColourLine(hybHBoardMaterial) !== null;

  useEffect(() => {
    if (tab === 'hybrid_h') {
      const material = fmsHybridHoBoardMaterialColourLine(hybHBoardMaterial);
      if (material) setHybridColour((c) => fmsHybridColourForMaterial(material, c));
    } else if (tab === 'hybrid_v') {
      setHybridColour((c) => fmsHybridColourForMaterial(hybVMaterial, c));
    }
  }, [tab, hybHBoardMaterial, hybVMaterial]);
  const [materialQuoteSketchLoadState, setMaterialQuoteSketchLoadState] = useState<
    'idle' | 'loading' | 'ok' | 'none'
  >('idle');
  /** Set when a linked quote is not PVC / chain / hybrid — hides FMS tab math, sketch may still load. */
  const [fmsQuoteMaterialUnsupported, setFmsQuoteMaterialUnsupported] = useState<string | null>(null);
  const materialQuoteUnsupportedAlertKeyRef = useRef('');
  /** Plan sketch from profile snapshot `?from_material_sketch_save=`. */
  const [profileSketchSaveLoadState, setProfileSketchSaveLoadState] = useState<
    'idle' | 'loading' | 'ok' | 'none'
  >('idle');

  const [contractorId, setContractorId] = useState<string | null>(null);
  const materialCalcDraftSnapshotRef = useRef<Record<string, unknown> | null>(null);
  const materialCalcSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const materialCalcHydrateKeyRef = useRef<string>('');
  /** Dedupe layout sketch → fence line sync when canvas re-notifies with the same geometry. */
  const sketchToLinesSyncKeyRef = useRef<string>('');
  /** True after the canvas has had at least one segment this session (avoids clearing imported layout lines). */
  const sketchHadSegmentsRef = useRef(false);

  const applySketchToFenceRuns = useCallback(
    (payload: LayoutSketchDrawingPayload, opts?: { force?: boolean }) => {
      if (!payload.segments?.length) return;
      const key = layoutSketchDataKey(payload);
      const panelModule = pvcPanelModule;
      const nextPvc = drawingDataToPvcLineRows(payload, panelModule);
      const nextChain = drawingDataToChainLineRows(payload, panelModule);
      const nextHyb = drawingDataToHybridVLineRows(payload, panelModule);
      if (!nextPvc?.length) return;

      setLines((prev) => {
        if (!opts?.force && !sketchFenceRowsNeedRefresh(prev, nextPvc, key, sketchToLinesSyncKeyRef.current)) {
          return prev;
        }
        return nextPvc.map((row, i) => mergePvcLineFromSketch(row, prev[i]));
      });
      if (nextChain?.length) {
        setChainLines((prev) => {
          if (!opts?.force && !sketchFenceRowsNeedRefresh(prev, nextChain, key, sketchToLinesSyncKeyRef.current)) {
            return prev;
          }
          return nextChain.map((row, i) => mergeFenceLineFromSketch(row, prev[i]));
        });
      }
      if (nextHyb?.length) {
        setHybVLines((prev) => {
          if (!opts?.force && !sketchFenceRowsNeedRefresh(prev, nextHyb, key, sketchToLinesSyncKeyRef.current)) {
            return prev;
          }
          return nextHyb.map((row, i) => mergeFenceLineFromSketch(row, prev[i]));
        });
        setHybHLines((prev) => {
          if (!opts?.force && !sketchFenceRowsNeedRefresh(prev, nextHyb, key, sketchToLinesSyncKeyRef.current)) {
            return prev;
          }
          return nextHyb.map((row, i) => mergeFenceLineFromSketch(row, prev[i]));
        });
      }
      sketchToLinesSyncKeyRef.current = key;
      sketchHadSegmentsRef.current = true;
    },
    [pvcPanelModule]
  );

  const handleLayoutDrawingChange = useCallback(
    (data: LayoutSketchDrawingPayload) => {
      if (Date.now() - programmaticSketchUpdateAtRef.current < 400) return;
      const normalized = normalizeLayoutSketchJoints(data);
      setLayoutSketchData(normalized);
      applySketchToFenceRuns(normalized, { force: true });
    },
    [applySketchToFenceRuns]
  );

  useEffect(() => {
    if (isStyleTabParam(tabParam)) {
      setTab(coerceStyleTab(tabParam));
    }
  }, [tabParam]);

  useEffect(() => {
    const pvc = coerceFmsPvcCalculatorColour(searchParams.get('pvc_colour'));
    if (pvc) setPvcBreakdownColour(pvc);
    const hw = coerceFmsWpcCalculatorColour(searchParams.get('hybrid_wpc'));
    const hp = coerceFmsPvcCalculatorColour(searchParams.get('hybrid_pvc'));
    const hc = coerceFmsHybridCalculatorColour(searchParams.get('hybrid_colour'));
    if (hc) setHybridColour(hc);
    else if (hw) setHybridColour(hw);
    else if (hp) setHybridColour(hp);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/contractor/me', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const id = data?.id;
        if (typeof id === 'string' && id) setContractorId(id);
        if (typeof data?.account_type === 'string') setAccountType(data.account_type);
        if (typeof data?.user_role === 'string') setUserRole(data.user_role);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSupplierAccount) return;
    setFmsRecipeLoading(true);
    fetch('/api/supplier/fms-calculator-recipe', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.recipe) setFmsRecipe(normalizeFmsCalculatorRecipe(d.recipe));
      })
      .catch(() => {})
      .finally(() => setFmsRecipeLoading(false));
  }, [isSupplierAccount]);

  useEffect(() => {
    if (!contractorId) return;
    const hydrateKey = `${contractorId}|${fromLayoutId ?? ''}|${fromMaterialQuoteId ?? ''}|${fromMaterialSketchSaveId ?? ''}|${materialRequestId}`;
    if (materialCalcHydrateKeyRef.current === hydrateKey) return;

    const hasUrlTab = isStyleTabParam(tabParam);
    const urlPvcCol = coerceFmsPvcCalculatorColour(searchParams.get('pvc_colour'));
    const urlHcCol = coerceFmsHybridCalculatorColour(searchParams.get('hybrid_colour'));
    const urlHwCol = coerceFmsWpcCalculatorColour(searchParams.get('hybrid_wpc'));
    const urlHpCol = coerceFmsPvcCalculatorColour(searchParams.get('hybrid_pvc'));
    const skipPvcLinesAndSketch = Boolean(
      fromLayoutId || fromMaterialQuoteId || fromMaterialSketchSaveId || materialRequestId
    );
    const skipDraftJobAndColour = Boolean(fromMaterialQuoteId || materialRequestId);

    const markHydrated = () => {
      materialCalcHydrateKeyRef.current = hydrateKey;
    };

    try {
      const raw = localStorage.getItem(materialCalculatorDraftStorageKey(contractorId));
      if (!raw) {
        markHydrated();
        return;
      }
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (d.v !== MATERIAL_CALC_DRAFT_VERSION) {
        markHydrated();
        return;
      }

      if (!hasUrlTab && typeof d.tab === 'string') setTab(coerceStyleTab(d.tab));
      if (!skipDraftJobAndColour && typeof d.jobAddress === 'string') setJobAddress(d.jobAddress);

      if (!skipDraftJobAndColour && !urlPvcCol) {
        const c = typeof d.pvcBreakdownColour === 'string' ? coerceFmsPvcCalculatorColour(d.pvcBreakdownColour) : null;
        if (c) setPvcBreakdownColour(c);
      }
      if (!skipDraftJobAndColour && !urlHcCol && !urlHwCol && !urlHpCol) {
        const c = typeof d.hybridColour === 'string' ? coerceFmsHybridCalculatorColour(d.hybridColour) : null;
        if (c) setHybridColour(c);
        else {
          const wpc =
            typeof d.hybridWpcColour === 'string' ? coerceFmsWpcCalculatorColour(d.hybridWpcColour) : null;
          const pvc =
            typeof d.hybridPvcColour === 'string' ? coerceFmsPvcCalculatorColour(d.hybridPvcColour) : null;
          if (wpc) setHybridColour(wpc);
          else if (pvc) setHybridColour(pvc);
        }
      }
      if (d.hybHBoardMaterial !== undefined || d.hybHFamily !== undefined || d.hybHMaterial !== undefined) {
        setHybHBoardMaterial(
          coerceFmsHybridHoBoardMaterial(d.hybHBoardMaterial, d.hybHFamily, d.hybHMaterial)
        );
      }
      if (d.hybVMaterial !== undefined) setHybVMaterial(coerceHybridMaterialLine(d.hybVMaterial));

      if (!skipPvcLinesAndSketch) {
        const pl = parsePvcLines(d.lines);
        if (pl) setLines(pl);
        const sketch = parseLayoutSketch(d.layoutSketchData);
        if (sketch) {
          sketchToLinesSyncKeyRef.current = '';
          setLayoutSketchData(normalizeLayoutSketchJoints(sketch));
          setLayoutCanvasRemountKey((k) => k + 1);
        }
        const sh = parsePvcGateRows(d.shortGates);
        if (sh) setShortGates(sh);
        const si = parsePvcGateRows(d.singleGates);
        if (si) setSingleGates(si);
        const db = parsePvcGateRows(d.doubleGates);
        if (db) setDoubleGates(db);
        const syncFromCount =
          typeof d.sketchGateSyncCount === 'number' || typeof d.sketchGateSyncCount === 'string'
            ? Math.max(0, Math.floor(Number(d.sketchGateSyncCount)))
            : sketch?.gate_placements?.length ?? 0;
        sketchSyncedGatePlacementCountRef.current = syncFromCount;
      } else {
        if (!fromMaterialQuoteId && !fromMaterialSketchSaveId && !materialRequestId) {
          const sh = parsePvcGateRows(d.shortGates);
          if (sh) setShortGates(sh);
          const si = parsePvcGateRows(d.singleGates);
          if (si) setSingleGates(si);
          const db = parsePvcGateRows(d.doubleGates);
          if (db) setDoubleGates(db);
        }
        sketchSyncedGatePlacementCountRef.current = 0;
      }

      if (typeof d.masterExtrasOpen === 'boolean') setMasterExtrasOpen(d.masterExtrasOpen);
      const mx = parseMasterExtras(d.masterExtras);
      if (mx && Object.keys(mx).length > 0) setMasterExtras(mx);
      setMaterialExclusions(parseMaterialExclusions(d.materialExclusions));
      if (typeof d.extraBoardsPct === 'string' || typeof d.extraBoardsPct === 'number')
        setExtraBoardsPct(String(d.extraBoardsPct));
      if (typeof d.extraLargeScrewPct === 'string' || typeof d.extraLargeScrewPct === 'number')
        setExtraLargeScrewPct(String(d.extraLargeScrewPct));
      if (typeof d.extraShortScrewPct === 'string' || typeof d.extraShortScrewPct === 'number')
        setExtraShortScrewPct(String(d.extraShortScrewPct));
      if (d.pvcPanelModule !== undefined) {
        setPvcPanelModule(coercePanelModule(d.pvcPanelModule));
      } else if (!skipPvcLinesAndSketch) {
        const pl = parsePvcLines(d.lines);
        if (pl?.[0]) setPvcPanelModule(coercePanelModule(pl[0].panel_module));
      }
      if (typeof d.pvcPanelSpacingFt === 'string' || typeof d.pvcPanelSpacingFt === 'number') {
        setPvcPanelSpacingFt(String(d.pvcPanelSpacingFt));
      } else if (d.pvcPanelModule !== undefined) {
        setPvcPanelSpacingFt(String(defaultFmsPvcPanelSpacingFt(coercePanelModule(d.pvcPanelModule))));
      }
      const cx = parseStringRecord(d.chainExtras);
      if (cx) setChainExtras(cx);
      const hhx = parseStringRecord(d.hybHExtras);
      if (hhx) setHybHExtras(hhx);
      const hvx = parseStringRecord(d.hybVExtras);
      if (hvx) setHybVExtras(hvx);

      const cl = parseChainLines(d.chainLines);
      if (cl) setChainLines(cl);
      if (typeof d.chainRailFt === 'string' || typeof d.chainRailFt === 'number') setChainRailFt(String(d.chainRailFt));
      if (typeof d.chainMeshFt === 'string' || typeof d.chainMeshFt === 'number') setChainMeshFt(String(d.chainMeshFt));
      if (typeof d.chainTiesPerBag === 'string' || typeof d.chainTiesPerBag === 'number')
        setChainTiesPerBag(String(d.chainTiesPerBag));
      const cg = parseChainGates(d.chainGates);
      if (cg) setChainGates(cg);

      if (d.hybHHeight !== undefined) setHybHHeight(coerceHybridHoHeight(d.hybHHeight));
      const hhl = parseHybridLines(d.hybHLines);
      if (hhl) setHybHLines(hhl);
      const hhgShort = parseHybridHFenceGateRows(d.hybHShortGates);
      const hhgSingle = parseHybridHFenceGateRows(d.hybHSingleGates);
      const hhgDouble = parseHybridHFenceGateRows(d.hybHDoubleGates);
      if (hhgShort.length || hhgSingle.length || hhgDouble.length) {
        setHybHShortGates(hhgShort);
        setHybHSingleGates(hhgSingle);
        setHybHDoubleGates(hhgDouble);
      } else {
        const legacy = migrateLegacyHybridHGates(d.hybHGates);
        if (legacy) {
          setHybHShortGates(legacy.short);
          setHybHSingleGates(legacy.single);
          setHybHDoubleGates(legacy.double);
        }
      }
      const hvl = parseHybridLines(d.hybVLines);
      if (hvl) setHybVLines(hvl);
      const hvgShort = parseHybridVFenceGateRows(d.hybVShortGates);
      const hvgSingle = parseHybridVFenceGateRows(d.hybVSingleGates);
      const hvgDouble = parseHybridVFenceGateRows(d.hybVDoubleGates);
      if (hvgShort.length || hvgSingle.length || hvgDouble.length) {
        setHybVShortGates(hvgShort);
        setHybVSingleGates(hvgSingle);
        setHybVDoubleGates(hvgDouble);
      } else {
        const legacyV = migrateLegacyHybridVGates(d.hybVGates);
        if (legacyV) {
          setHybVShortGates(legacyV.short);
          setHybVSingleGates(legacyV.single);
          setHybVDoubleGates(legacyV.double);
        }
      }
      markHydrated();
    } catch {
      markHydrated();
    }
  }, [contractorId, fromLayoutId, fromMaterialQuoteId, fromMaterialSketchSaveId, materialRequestId, tabParam, searchParams]);

  useLayoutEffect(() => {
    if (!contractorId) {
      materialCalcDraftSnapshotRef.current = null;
      return;
    }
    materialCalcDraftSnapshotRef.current = {
      v: MATERIAL_CALC_DRAFT_VERSION,
      tab,
      jobAddress,
      pvcBreakdownColour,
      pvcPanelModule,
      pvcPanelSpacingFt,
      lines,
      layoutSketchData,
      shortGates,
      singleGates,
      doubleGates,
      sketchGateSyncCount: sketchSyncedGatePlacementCountRef.current,
      masterExtrasOpen,
      masterExtras,
      extraBoardsPct,
      extraLargeScrewPct,
      extraShortScrewPct,
      chainExtras,
      hybHExtras,
      hybVExtras,
      chainLines,
      chainRailFt,
      chainMeshFt,
      chainTiesPerBag,
      chainGates,
      hybHBoardMaterial,
      hybHHeight,
      hybHLines,
      hybHShortGates,
      hybHSingleGates,
      hybHDoubleGates,
      hybVMaterial,
      hybVLines,
      hybVShortGates,
      hybVSingleGates,
      hybVDoubleGates,
      hybridColour,
      materialExclusions,
    };
  }, [
    contractorId,
    tab,
    jobAddress,
    pvcBreakdownColour,
    pvcPanelModule,
    pvcPanelSpacingFt,
    lines,
    layoutSketchData,
    shortGates,
    singleGates,
    doubleGates,
    masterExtrasOpen,
    masterExtras,
    extraBoardsPct,
    extraLargeScrewPct,
    extraShortScrewPct,
    chainExtras,
    hybHExtras,
    hybVExtras,
    chainLines,
    chainRailFt,
    chainMeshFt,
    chainTiesPerBag,
    chainGates,
    hybHBoardMaterial,
    hybHHeight,
    hybHLines,
    hybHShortGates,
    hybHSingleGates,
    hybHDoubleGates,
    hybVMaterial,
    hybVLines,
    hybVShortGates,
    hybVSingleGates,
    hybVDoubleGates,
    hybridColour,
    materialExclusions,
  ]);

  const toggleMaterialInclude = useCallback((matTab: MaterialCalcTab, label: string, included: boolean) => {
    setMaterialExclusions((prev) => toggleMaterialExclusion(prev, matTab, label, included));
  }, []);

  const skipPostsForTab = useCallback((matTab: MaterialCalcTab, labels: string[]) => {
    const postLabels = postRelatedMaterialLabels(matTab, labels);
    if (!postLabels.length) return;
    setMaterialExclusions((prev) => excludeMaterialLabels(prev, matTab, postLabels));
  }, []);

  useEffect(() => {
    if (!contractorId) return;
    if (materialCalcSaveTimerRef.current != null) clearTimeout(materialCalcSaveTimerRef.current);
    materialCalcSaveTimerRef.current = setTimeout(() => {
      materialCalcSaveTimerRef.current = null;
      try {
        const payload = materialCalcDraftSnapshotRef.current;
        if (payload) localStorage.setItem(materialCalculatorDraftStorageKey(contractorId), JSON.stringify(payload));
      } catch {
        /* quota / private mode */
      }
    }, 450);
    return () => {
      if (materialCalcSaveTimerRef.current != null) clearTimeout(materialCalcSaveTimerRef.current);
    };
  }, [
    contractorId,
    tab,
    jobAddress,
    pvcBreakdownColour,
    lines,
    layoutSketchData,
    shortGates,
    singleGates,
    doubleGates,
    masterExtrasOpen,
    masterExtras,
    extraBoardsPct,
    extraLargeScrewPct,
    extraShortScrewPct,
    chainExtras,
    hybHExtras,
    hybVExtras,
    chainLines,
    chainRailFt,
    chainMeshFt,
    chainTiesPerBag,
    chainGates,
    hybHBoardMaterial,
    hybHHeight,
    hybHLines,
    hybHShortGates,
    hybHSingleGates,
    hybHDoubleGates,
    hybVMaterial,
    hybVLines,
    hybVShortGates,
    hybVSingleGates,
    hybVDoubleGates,
    hybridColour,
  ]);

  useEffect(() => {
    if (!contractorId) return;
    const flushSave = () => {
      try {
        const payload = materialCalcDraftSnapshotRef.current;
        if (payload) localStorage.setItem(materialCalculatorDraftStorageKey(contractorId), JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    };
    const onPageHide = () => flushSave();
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVis);
      flushSave();
    };
  }, [contractorId]);

  const resetMaterialCalculator = useCallback(() => {
    if (
      !window.confirm(
        'Reset the entire material calculator (all tabs), clear the layout sketch, and remove the saved draft on this device?'
      )
    ) {
      return;
    }
    if (contractorId) {
      try {
        localStorage.removeItem(materialCalculatorDraftStorageKey(contractorId));
      } catch {
        /* ignore */
      }
    }
    sketchSyncedGatePlacementCountRef.current = 0;
    sketchHadSegmentsRef.current = false;
    sketchToLinesSyncKeyRef.current = '';
    setTab('pvc');
    setJobAddress('');
    setPvcBreakdownColour('Adobe');
    setPvcPanelModule('nominal_7ft');
    setLines(defaultPvcLines());
    setLayoutSketchData(null);
    setLayoutCanvasRemountKey((k) => k + 1);
    setShortGates([]);
    setSingleGates([]);
    setDoubleGates([]);
    setMasterExtrasOpen(false);
    setMasterExtras({});
    setExtraBoardsPct('');
    setExtraLargeScrewPct('');
    setExtraShortScrewPct('');
    setChainExtras({});
    setHybHExtras({});
    setHybVExtras({});
    setChainLines(defaultChainLines());
    setChainRailFt('10');
    setChainMeshFt('50');
    setChainTiesPerBag('100');
    setChainGates([]);
    setHybHBoardMaterial('wpcWoodGrain');
    setHybHHeight(6);
    setHybHLines(defaultHybridLines());
    setHybHShortGates([]);
    setHybHSingleGates([]);
    setHybHDoubleGates([]);
    setHybVMaterial('pvc');
    setHybVLines(defaultHybridLines());
    setHybVShortGates([]);
    setHybVSingleGates([]);
    setHybVDoubleGates([]);
    setHybridColour('Ash');
    setMaterialExclusions({});
    setFmsQuoteMaterialUnsupported(null);
    materialQuoteUnsupportedAlertKeyRef.current = '';
  }, [contractorId]);

  useEffect(() => {
    if (fromMaterialQuoteId || fromMaterialSketchSaveId || materialRequestId) return;
    if (!fromLayoutId) return;
    let cancelled = false;
    fetch(`/api/contractor/layouts/${encodeURIComponent(fromLayoutId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.drawing_data) return;
        const dd = data.drawing_data as {
          points?: { x: number; y: number }[];
          segments?: { length_ft?: number }[];
          gate_placements?: SketchGatePlacement[];
        };
        const pts = Array.isArray(dd.points) ? dd.points : [];
        const segMeta = Array.isArray(dd.segments) ? dd.segments : [];
        const inferred = drawingDataToPvcLineRows(
          { points: pts, segments: segMeta, gate_placements: dd.gate_placements },
          'nominal_7ft'
        );
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
  }, [fromLayoutId, fromMaterialQuoteId, fromMaterialSketchSaveId, materialRequestId]);

  /** Material quote request (contractor `from_material_quote` or supplier `materialRequest`) → sketch + PVC tab. */
  useEffect(() => {
    if (fromMaterialSketchSaveId) return;
    const fromContractor = fromMaterialQuoteId.trim();
    const fromSupplier = materialRequestId.trim();
    if (!fromContractor && !fromSupplier) {
      setMaterialQuoteSketchLoadState('idle');
      setFmsQuoteMaterialUnsupported(null);
      materialQuoteUnsupportedAlertKeyRef.current = '';
      setImportedMaterialRequest(null);
      return;
    }
    const useSupplierApi = !fromContractor && Boolean(fromSupplier);
    const url = useSupplierApi
      ? `/api/supplier/material-quote-requests/${encodeURIComponent(fromSupplier)}`
      : `/api/contractor/material-quote-requests/${encodeURIComponent(fromContractor)}`;

    setMaterialQuoteSketchLoadState('loading');
    setFmsQuoteMaterialUnsupported(null);
    let cancelled = false;
    fetch(url, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { request?: MaterialQuoteRequestDto } | null) => {
        if (cancelled) return;
        if (!json?.request) {
          setMaterialQuoteSketchLoadState('none');
          setFmsQuoteMaterialUnsupported(null);
          setImportedMaterialRequest(null);
          return;
        }
        const req = json.request;
        setImportedMaterialRequest(req);
        const { savedCalcColour } = applyMaterialQuoteCalculatorFields(req, {
          setJobAddress,
          setPvcBreakdownColour,
          setHybridColour,
          setHybHBoardMaterial,
          setHybVMaterial,
        });
        const sketch = layoutSketchFromMaterialQuoteProject(req.project);
        setShortGates([]);
        setSingleGates([]);
        setDoubleGates([]);
        setChainGates([]);
        setHybVShortGates([]);
        setHybVSingleGates([]);
        setHybVDoubleGates([]);
        sketchSyncedGatePlacementCountRef.current = 0;
        sketchToLinesSyncKeyRef.current = '';
        if (sketch) {
          setLayoutSketchData(normalizeLayoutSketchJoints(sketch));
          setLayoutCanvasRemountKey((k) => k + 1);
          sketchHadSegmentsRef.current = true;
          setMaterialQuoteSketchLoadState('ok');
        } else {
          setLayoutSketchData(null);
          sketchHadSegmentsRef.current = false;
          setMaterialQuoteSketchLoadState('none');
        }

        const inferred = inferFmsHubMaterialFromQuoteProject({
          design_summary: req.project?.design_summary ?? null,
          design_option: req.project?.design_option ?? null,
        });
        const alertKey = `${fromContractor}|${fromSupplier}`;
        if (inferred.kind === 'unsupported') {
          setFmsQuoteMaterialUnsupported(inferred.materialLabel);
          if (materialQuoteUnsupportedAlertKeyRef.current !== alertKey) {
            materialQuoteUnsupportedAlertKeyRef.current = alertKey;
            queueMicrotask(() => {
              window.alert(
                `No FMS material calculator is available for this material yet (${inferred.materialLabel}). ` +
                  'This hub supports PVC / vinyl, chain link, and hybrid only. You can still review the job sketch and details above.'
              );
            });
          }
          setTab('pvc');
          const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
          params.delete('tab');
          router.replace(`${pathname}?${params.toString()}`);
        } else {
          setFmsQuoteMaterialUnsupported(null);
          materialQuoteUnsupportedAlertKeyRef.current = alertKey;
          if (inferred.kind === 'pvc' && inferred.pvcColour && !savedCalcColour) {
            setPvcBreakdownColour(inferred.pvcColour);
          }
          if (inferred.kind === 'hybrid') {
            if (!savedCalcColour) {
              const material = inferred.hybridMaterialLine ?? (inferred.tab === 'hybrid_v' ? 'pvc' : 'wpc');
              const c =
                inferred.wpcColour ??
                inferred.pvcColour ??
                coerceFmsHybridCalculatorColour(req.project?.design_option?.colour ?? '');
              if (c) setHybridColour(fmsHybridColourForMaterial(material, c));
            }
            if (inferred.hybridMaterialLine) {
              if (inferred.tab === 'hybrid_v') {
                setHybVMaterial(inferred.hybridMaterialLine);
              } else {
                const style = String(req.project?.design_option?.style ?? '');
                setHybHBoardMaterial(
                  inferFmsHybridHoBoardMaterialFromStyle(style, inferred.hybridMaterialLine)
                );
              }
            }
          }
          if (inferred.tab) {
            const mapped = coerceStyleTab(inferred.tab);
            setTab(mapped);
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            params.set('tab', mapped);
            router.replace(`${pathname}?${params.toString()}`);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaterialQuoteSketchLoadState('none');
          setFmsQuoteMaterialUnsupported(null);
          setImportedMaterialRequest(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fromMaterialQuoteId, fromMaterialSketchSaveId, materialRequestId, pathname, router]);

  /** Profile-saved map sketch → PVC tab. */
  useEffect(() => {
    if (!fromMaterialSketchSaveId) {
      setProfileSketchSaveLoadState('idle');
      return;
    }
    if (fromMaterialQuoteId || materialRequestId) {
      setProfileSketchSaveLoadState('idle');
      return;
    }
    setProfileSketchSaveLoadState('loading');
    let cancelled = false;
    fetch(`/api/contractor/material-list-saves/${encodeURIComponent(fromMaterialSketchSaveId)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { save?: { title?: string; drawing_data?: unknown } } | null) => {
        if (cancelled) return;
        if (!json?.save?.drawing_data) {
          setProfileSketchSaveLoadState('none');
          return;
        }
        const title = typeof json.save.title === 'string' ? json.save.title.trim() : '';
        if (title) setJobAddress((prev) => (prev.trim() ? prev : title));
        const sketch = parseLayoutSketch(json.save.drawing_data);
        setShortGates([]);
        setSingleGates([]);
        setDoubleGates([]);
        setChainGates([]);
        setHybVShortGates([]);
        setHybVSingleGates([]);
        setHybVDoubleGates([]);
        sketchSyncedGatePlacementCountRef.current = 0;
        sketchToLinesSyncKeyRef.current = '';
        if (sketch) {
          setLayoutSketchData(normalizeLayoutSketchJoints(sketch));
          setLayoutCanvasRemountKey((k) => k + 1);
          sketchHadSegmentsRef.current = true;
          setProfileSketchSaveLoadState('ok');
        } else {
          setLayoutSketchData(null);
          sketchHadSegmentsRef.current = false;
          setProfileSketchSaveLoadState('none');
        }
        setTab('pvc');
      })
      .catch(() => {
        if (!cancelled) setProfileSketchSaveLoadState('none');
      });
    return () => {
      cancelled = true;
    };
  }, [fromMaterialSketchSaveId, fromMaterialQuoteId, materialRequestId]);

  /** Layout sketch geometry → PVC, chain link and hybrid vertical fence runs (same corner / D6 logic per segment). */
  useEffect(() => {
    const payload = layoutSketchData;
    if (!payload?.segments?.length) {
      if (sketchHadSegmentsRef.current) {
        sketchHadSegmentsRef.current = false;
        sketchToLinesSyncKeyRef.current = '';
        setLines((prev) => (prev.length > 0 && prev.every((l) => l.fromSketch) ? defaultPvcLines() : prev));
        setChainLines((prev) => (prev.length > 0 && prev.every((l) => l.fromSketch) ? defaultChainLines() : prev));
        setHybVLines((prev) => (prev.length > 0 && prev.every((l) => l.fromSketch) ? defaultHybridLines() : prev));
        setHybHLines((prev) => (prev.length > 0 && prev.every((l) => l.fromSketch) ? defaultHybridLines() : prev));
      }
      return;
    }
    applySketchToFenceRuns(payload);
  }, [layoutSketchData, applySketchToFenceRuns]);

  /** New gates placed on the layout sketch → PVC + chain link gate rows; scroll to the active tab’s gate block. */
  useEffect(() => {
    const drawing = layoutSketchData;
    const gp = drawing?.gate_placements;
    const segs = drawing?.segments;
    if (!gp || !segs?.length) {
      sketchSyncedGatePlacementCountRef.current = gp?.length ?? 0;
      return;
    }
    if (gp.length < sketchSyncedGatePlacementCountRef.current) {
      sketchSyncedGatePlacementCountRef.current = gp.length;
      return;
    }
    if (gp.length === sketchSyncedGatePlacementCountRef.current) return;

    const start = sketchSyncedGatePlacementCountRef.current;
    const newPlacements = gp.slice(start);
    for (let j = 0; j < newPlacements.length; j++) {
      const placement = newPlacements[j];
      const placementIndex = start + j;
      const { kind, row } = pvcGateFromSketchPlacement(placement, segs);
      const tagged = { ...row, sketchPlacementIndex: placementIndex };
      if (kind === 'short') setShortGates((p) => [...p, tagged]);
      else if (kind === 'single') setSingleGates((p) => [...p, tagged]);
      else setDoubleGates((p) => [...p, tagged]);
      setChainGates((p) => [
        ...p,
        { ...chainGateRowFromSketchPlacement(placement, segs), sketchPlacementIndex: placementIndex },
      ]);
      setHybVShortGates((p) => (kind === 'short' ? [...p, tagged] : p));
      setHybVSingleGates((p) => (kind === 'single' ? [...p, tagged] : p));
      setHybVDoubleGates((p) => (kind === 'double' ? [...p, tagged] : p));
      const hybGate = { ...hybridFenceGateFromSketchPlacement(placement, segs), sketchPlacementIndex: placementIndex };
      if (kind === 'short') setHybHShortGates((p) => [...p, hybGate]);
      else if (kind === 'single') setHybHSingleGates((p) => [...p, hybGate]);
      else setHybHDoubleGates((p) => [...p, hybGate]);
    }
    sketchSyncedGatePlacementCountRef.current = gp.length;

    if (newPlacements.length > 0) {
      requestAnimationFrame(() => {
        if (tab === 'chain') chainGatesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        else pvcGatesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [layoutSketchData, tab]);

  const effectivePvcPanelSpacingFt = useMemo(
    () => parsePanelSpacingFt(pvcPanelSpacingFt, pvcPanelModule),
    [pvcPanelSpacingFt, pvcPanelModule]
  );
  const pvcInputs = useMemo(
    () => buildInputs(lines, effectivePvcPanelSpacingFt, layoutSketchData),
    [lines, effectivePvcPanelSpacingFt, layoutSketchData]
  );
  const pvcSharedBoundaryDedup = useMemo(
    () => detectSharedBoundaryDoubleCounts(lines.map((r) => effectiveRunEnds(r)), layoutSketchData),
    [lines, layoutSketchData]
  );
  const pvcJob = useMemo(
    () =>
      aggregateFmsPvcFenceLines(pvcInputs, fmsRecipe, {
        sharedBoundaryDedup: pvcSharedBoundaryDedup,
      }),
    [pvcInputs, fmsRecipe, pvcSharedBoundaryDedup]
  );
  const pvcFenceLinearFt = useMemo(
    () => pvcInputs.reduce((acc, row) => acc + (Number(row.length_ft) || 0), 0),
    [pvcInputs]
  );

  const classifiedGates = useMemo(
    () => classifyPvcGateInputs(shortGates, singleGates, doubleGates),
    [shortGates, singleGates, doubleGates]
  );

  const gateMerge = useMemo(
    () =>
      sumGateAdobeRows(
        classifiedGates.short,
        classifiedGates.single,
        classifiedGates.double,
        fmsRecipe
      ),
    [classifiedGates, fmsRecipe]
  );

  const gateWidthInchesSum = useMemo(() => {
    const sum = (arr: { gate_width_in: number }[]) => arr.reduce((a, g) => a + g.gate_width_in, 0);
    return (
      sum(classifiedGates.short) + sum(classifiedGates.single) + sum(classifiedGates.double)
    );
  }, [classifiedGates]);

  const gateCount =
    classifiedGates.short.length +
    classifiedGates.single.length +
    classifiedGates.double.length;

  const extrasParsed: FmsPvcMasterExtras = useMemo(() => {
    const o: FmsPvcMasterExtras = {};
    const integerKeys = new Set<keyof FmsPvcMasterExtras>(['m14', 'm15', 'm16', 'm9']);
    const boardGroup = MASTER_EXTRA_GROUPS.find((g) => g.mode === 'board_stiffener_ratio');
    const skipKeys = new Set<keyof FmsPvcMasterExtras>();
    if (boardGroup?.mode === 'board_stiffener_ratio') skipKeys.add(boardGroup.stiffKey);

    for (const k of MASTER_EXTRA_KEYS) {
      if (skipKeys.has(k)) continue;
      const s = masterExtras[k];
      if (s == null || s === '') continue;
      const n = Number(String(s).replace(/,/g, ''));
      if (!Number.isFinite(n)) continue;
      (o as Record<string, number>)[k] = integerKeys.has(k) ? Math.round(n) : n;
    }

    const boardStr = masterExtras.m8;
    if (boardStr != null && boardStr !== '') {
      const boards = Number(String(boardStr).replace(/,/g, ''));
      if (Number.isFinite(boards) && boards > 0) {
        o.m8 = boards;
        o.m9 = boardStiffenersForBoardCount(
          boards,
          fmsRecipe.packs.board_per_pack,
          fmsRecipe.packs.board_stiffeners_per_pack
        );
      }
    }

    return o;
  }, [masterExtras, fmsRecipe]);

  const pvcAdobe = useMemo(
    () =>
      applySharedBoundaryDedupToAdobeBreakdown(
        buildPvcAdobeBreakdown(pvcJob.lines, gateMerge.merged, gateWidthInchesSum),
        pvcSharedBoundaryDedup,
        fmsRecipe
      ),
    [pvcJob.lines, gateMerge.merged, gateWidthInchesSum, pvcSharedBoundaryDedup, fmsRecipe]
  );

  const parsePctField = useCallback((raw: string) => {
    const n = Number(String(raw).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);

  const extraBoardsPctNum = useMemo(() => parsePctField(extraBoardsPct), [extraBoardsPct, parsePctField]);
  const extraLargeScrewPctNum = useMemo(
    () => parsePctField(extraLargeScrewPct),
    [extraLargeScrewPct, parsePctField]
  );
  const extraShortScrewPctNum = useMemo(
    () => parsePctField(extraShortScrewPct),
    [extraShortScrewPct, parsePctField]
  );

  const pvcPercentUplifts = useMemo(
    (): FmsPvcMasterPercentUplifts => ({
      boardsPct: extraBoardsPctNum,
      largeScrewPct: extraLargeScrewPctNum,
      shortScrewPct: extraShortScrewPctNum,
    }),
    [extraBoardsPctNum, extraLargeScrewPctNum, extraShortScrewPctNum]
  );

  /** Preview of how many boards the percentage uplift adds (base boards incl. manual extras). */
  const extraBoardsPctAdd = useMemo(() => {
    const base = (pvcAdobe[8] ?? 0) + (pvcAdobe[23] ?? 0) + (extrasParsed.m8 ?? 0);
    return pvcQtyPercentAdd(base, extraBoardsPctNum);
  }, [pvcAdobe, extrasParsed, extraBoardsPctNum]);

  const extraLargeScrewPctAdd = useMemo(() => {
    const base =
      (pvcAdobe[10] ?? 0) +
      (pvcAdobe[26] ?? 0) +
      fmsRecipe.master_rollups.large_screw_add +
      (extrasParsed.m21 ?? 0);
    return pvcQtyPercentAdd(base, extraLargeScrewPctNum);
  }, [pvcAdobe, extrasParsed, extraLargeScrewPctNum, fmsRecipe.master_rollups.large_screw_add]);

  const extraShortScrewPctAdd = useMemo(() => {
    const base = (pvcAdobe[11] ?? 0) + (pvcAdobe[25] ?? 0) + (extrasParsed.m22 ?? 0);
    return pvcQtyPercentAdd(base, extraShortScrewPctNum);
  }, [pvcAdobe, extrasParsed, extraShortScrewPctNum]);

  const pvcMaster = useMemo(
    () =>
      computePvcMasterColumn(
        pvcAdobe,
        extrasParsed,
        gateCount,
        pvcFenceLinearFt,
        pvcPercentUplifts,
        fmsRecipe
      ),
    [pvcAdobe, extrasParsed, gateCount, pvcFenceLinearFt, pvcPercentUplifts, fmsRecipe]
  );

  const pvcRunBreakdown = useMemo((): PvcRunBreakdownRow[] => {
    const spacing = effectivePvcPanelSpacingFt;
    const placements = layoutSketchData?.gate_placements;

    const allGates: PvcRunBreakdownRow[] = [
      ...buildPvcGateBreakdownRows('short', shortGates, 'Walk gate', fmsRecipe),
      ...buildPvcGateBreakdownRows('single', singleGates, 'Single gate', fmsRecipe),
      ...buildPvcGateBreakdownRows('double', doubleGates, 'Double gate', fmsRecipe),
    ];

    const gatesBySegment = new Map<number, PvcRunBreakdownRow[]>();
    for (const gate of allGates) {
      const segIdx = segmentIndexForGateRow(gate, placements);
      if (segIdx == null) continue;
      const list = gatesBySegment.get(segIdx) ?? [];
      list.push(gate);
      gatesBySegment.set(segIdx, list);
    }

    const usedGateIds = new Set<string>();

    const runRows: PvcRunBreakdownRow[] = lines.map((lr, i) => {
      const runLabel = lr.label || `Run ${i + 1}`;
      const grossL = Math.max(0, Number(String(lr.length_ft).replace(/,/g, '')) || 0);
      const netL = layoutSketchData?.segments?.length
        ? fenceCalcLengthFtForSketchSegment(i, grossL, layoutSketchData)
        : grossL;
      const sketchCtx = layoutSketchData?.segments?.length
        ? { segmentIndex: i, sketch: layoutSketchData }
        : undefined;
      const panelLabel = formatPvcPanelSummary(lr.panel_module, spacing);
      const input = buildInputForPvcLineRow(lr, spacing, sketchCtx);
      const fenceMats = input
        ? (() => {
            const r = computeFmsPvcFenceLine(input, fmsRecipe);
            return {
              panels: r.total_whole_panels,
              h_post: r.h_post,
              u_channel: r.u_channel,
              rail: r.rail,
              board: r.board,
              panelLabel: formatPvcPanelSummary(lr.panel_module, r.input.panel_spacing_ft ?? spacing),
            };
          })()
        : {
            panels: 0,
            h_post: 0,
            u_channel: 0,
            rail: 0,
            board: 0,
            panelLabel: netL > 0 ? panelLabel : 'Gate opening (no fence left)',
          };

      const gatesOnRun = gatesBySegment.get(i) ?? [];
      if (gatesOnRun.length === 0) {
        if (input) {
          return {
            kind: 'fence',
            id: lr.id,
            label: runLabel,
            length_ft: grossL,
            panelLabel: fenceMats.panelLabel,
            panels: fenceMats.panels,
            h_post: fenceMats.h_post,
            u_channel: fenceMats.u_channel,
            rail: fenceMats.rail,
            board: fenceMats.board,
          };
        }
        return {
          kind: 'fence',
          id: lr.id,
          label: runLabel,
          length_ft: grossL,
          panelLabel: fenceMats.panelLabel,
          panels: 0,
          h_post: 0,
          u_channel: 0,
          rail: 0,
          board: 0,
        };
      }

      for (const g of gatesOnRun) usedGateIds.add(g.id);

      const gateFt = gatesOnRun.reduce((sum, g) => sum + g.length_ft, 0);
      const gateTypeLabel = Array.from(new Set(gatesOnRun.map((g) => g.panelLabel))).join(' + ');
      const merged = gatesOnRun.reduce(
        (acc, g) => ({
          h_post: acc.h_post + g.h_post,
          u_channel: acc.u_channel + g.u_channel,
          rail: acc.rail + g.rail,
          board: acc.board + g.board,
        }),
        {
          h_post: fenceMats.h_post,
          u_channel: fenceMats.u_channel,
          rail: fenceMats.rail,
          board: fenceMats.board,
        }
      );

      const gateOnly = netL <= 0;
      if (gateOnly) {
        const primary = gatesOnRun[0];
        const gateTotals = gatesOnRun.reduce(
          (acc, g) => ({
            h_post: acc.h_post + g.h_post,
            u_channel: acc.u_channel + g.u_channel,
            rail: acc.rail + g.rail,
            board: acc.board + g.board,
          }),
          { h_post: 0, u_channel: 0, rail: 0, board: 0 }
        );
        return {
          kind: 'gate',
          id: lr.id,
          label: runLabel,
          gateKind: primary.kind === 'gate' ? primary.gateKind : 'short',
          length_ft: gateFt,
          panelLabel: gateTypeLabel,
          hasGate: true,
          panels: 0,
          ...gateTotals,
        };
      }

      return {
        kind: 'fence',
        id: lr.id,
        label: `${runLabel} with gate`,
        length_ft: grossL,
        panelLabel: `${fenceMats.panelLabel} · ${gateTypeLabel}`,
        panels: fenceMats.panels,
        hasGate: true,
        ...merged,
      };
    });

    const unlinkedGates = allGates.filter((g) => !usedGateIds.has(g.id));
    return [...runRows, ...unlinkedGates];
  }, [lines, shortGates, singleGates, doubleGates, effectivePvcPanelSpacingFt, layoutSketchData, fmsRecipe]);

  const adobeRows = useMemo(() => adobeBreakdownToMergedRows(pvcAdobe, fmsRecipe), [pvcAdobe, fmsRecipe]);

  const bomTsv = useMemo(() => {
    const head = ['Job address/PO #', jobAddress || '—', '', ''].join('\t');
    const colourLine = ['PVC colour / breakdown tab', pvcBreakdownColour, '', ''].join('\t');
    const fenceHdr = ['Fence-only SKU rollup (Excel block)', '', '', ''].join('\t');
    const hdr = ['SKU', 'Qty'].join('\t');
    const fenceRows = pvcJob.sku_rows
      .filter((r) => isMaterialIncluded(materialExclusions, 'pvc', r.label))
      .map((r) => `${r.label}\t${r.quantity}`);
    const extra = [`Whole panels (sum D9)`, `${pvcJob.sum_whole_panels}`, '', ''].join('\t');
    const concF = isMaterialIncluded(materialExclusions, 'pvc', 'Concrete')
      ? [`Concrete (fence H-post only × 2.5)`, `${pvcJob.concrete_bags_est}`, '', ''].join('\t')
      : null;
    const adobeH = [`${fmsPvcMaterialListBreakdownTitle(pvcBreakdownColour)} (J row → qty)`, '', '', ''].join('\t');
    const adobeBody = adobeRows
      .filter((r) => isMaterialIncluded(materialExclusions, 'pvc', r.label))
      .map((r) => `${r.label}\t${r.qty}`);
    const masterH = [`Master column C — ${pvcBreakdownColour}`, '', '', ''].join('\t');
    const masterHdr = ['Item', 'Total', 'Packs', 'Extras'].join('\t');
    const masterBody = pvcMaster
      .filter((r) => r.header || !r.label?.trim() || isMaterialIncluded(materialExclusions, 'pvc', r.label))
      .map((r) =>
        r.header
          ? `— ${r.label} —`
          : `${r.label}\t${r.qty}\t${formatPacksCell(r.packs ?? 0)}\t${formatLooseExtra(r.loose ?? 0)}`
      );
    return [
      head,
      colourLine,
      '',
      fenceHdr,
      hdr,
      ...fenceRows,
      extra,
      ...(concF ? [concF] : []),
      '',
      adobeH,
      'Item\tQty',
      ...adobeBody,
      '',
      masterH,
      masterHdr,
      ...masterBody,
    ].join('\n');
  }, [pvcJob, jobAddress, pvcBreakdownColour, adobeRows, pvcMaster, materialExclusions]);

  const copyBom = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bomTsv);
      alert('Copied material summary as TSV.');
    } catch {
      prompt('Copy:', bomTsv);
    }
  }, [bomTsv]);

  const buildMasterMaterialListPdfBlob = useCallback(async (): Promise<{ blob: Blob; filename: string }> => {
    const { buildMasterMaterialListPdfRows, finalizePdfRowsForPicking } = await import('@/lib/master-material-list-pdf-data');
    const rows = finalizePdfRowsForPicking(
      buildMasterMaterialListPdfRows(
        pvcAdobe,
        extrasParsed,
        gateCount,
        pvcFenceLinearFt,
        pvcPercentUplifts,
        fmsRecipe
      ).filter((r) => {
        if (r.section === 'wareHeader' || r.section === 'spacer' || r.section === 'totals' || r.section === 'taxRow') {
          return true;
        }
        return isMaterialIncluded(materialExclusions, 'pvc', r.label);
      })
    );
    const activeMod = pvcPanelModule;
    const heightLabel = activeMod === 'nominal_7ft' ? "7'" : "6'";
    const subtitle = `${pvcBreakdownColour} – ${heightLabel}`;
    const [{ pdf }, { MasterMaterialListPdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/lib/master-material-list-pdf-document'),
    ]);
    const blob = await pdf(
      <MasterMaterialListPdfDocument
        subtitle={subtitle}
        addressLine={jobAddress.trim() || '—'}
        colourColumnTitle={pvcBreakdownColour}
        rows={rows}
      />
    ).toBlob();
    const slug = (jobAddress || 'master-material-list')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 72);
    return { blob, filename: `${slug || 'master-material-list'}.pdf` };
  }, [
    pvcAdobe,
    extrasParsed,
    gateCount,
    pvcFenceLinearFt,
    pvcPercentUplifts,
    pvcPanelModule,
    pvcBreakdownColour,
    jobAddress,
    materialExclusions,
    fmsRecipe,
  ]);

  const downloadMasterMaterialListPdf = useCallback(async () => {
    const { blob, filename } = await buildMasterMaterialListPdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [buildMasterMaterialListPdfBlob]);

  const saveFmsRecipe = useCallback(async () => {
    const res = await fetch('/api/supplier/fms-calculator-recipe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ recipe: fmsRecipe }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Save failed');
    if (d.recipe) setFmsRecipe(normalizeFmsCalculatorRecipe(d.recipe));
    alert('Product setup saved.');
  }, [fmsRecipe]);

  const chainSharedBoundaryDedup = useMemo(
    () =>
      detectSharedBoundaryDoubleCounts(
        chainLines.map((r) => effectiveChainRunEnds(r)),
        layoutSketchData
      ),
    [chainLines, layoutSketchData]
  );
  const chainEffectiveTerminations = useMemo(
    () =>
      resolveJobRunTerminations(
        chainLines.map((r) => effectiveChainRunEnds(r)),
        layoutSketchData
      ),
    [chainLines, layoutSketchData]
  );

  /** Chain link aggregates */
  const chainFenceInputs: FmsChainLinkFenceInput[] = useMemo(() => {
    const d7 = Math.max(0.01, Number(chainRailFt) || 10);
    const d8 = Math.max(0.01, Number(chainMeshFt) || 50);
    const d9 = Math.max(0.01, Number(chainTiesPerBag) || 100);
    return chainLines
      .map((row, i) => {
        const grossL = Math.max(0, Number(String(row.length_ft).replace(/,/g, '')) || 0);
        const L = fenceCalcLengthFtForSketchSegment(i, grossL, layoutSketchData);
        if (L <= 0) return null;
        const d6 = chainEffectiveTerminations[i]?.d6 ?? 0;
        return { length_ft: L, terminal_post_type: d6, rail_length_ft: d7, mesh_roll_ft: d8, ties_per_bag: d9 };
      })
      .filter(Boolean) as FmsChainLinkFenceInput[];
  }, [chainLines, chainRailFt, chainMeshFt, chainTiesPerBag, layoutSketchData, chainEffectiveTerminations]);

  /** Per-line sums for posts/caps/bands/ties; rails + mesh from total linear ft across the job. */
  const chainFenceAgg = useMemo(
    () =>
      aggregateFmsChainLinkFenceLines(chainFenceInputs, {
        sharedBoundaryDedup: chainSharedBoundaryDedup,
      }),
    [chainFenceInputs, chainSharedBoundaryDedup]
  );

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

  /** Chain fence totals (with extra items added) — shared by the master table, PDF and supplier quote. */
  const chainFenceRows = useMemo(() => {
    if (!chainFenceAgg) return null;
    const ex = (k: string) => styleExtraValue(chainExtras, k);
    const row = (key: string, label: string, base: number) => ({ key, label, qty: base + ex(key) });
    return [
      row('terminal_post', 'Terminal post', chainFenceAgg.terminal_post),
      row('line_post', 'Line post', chainFenceAgg.line_post),
      row('terminal_post_cap', 'Terminal post cap', chainFenceAgg.terminal_post_cap),
      row('line_post_loop_cap', 'Line post loop cap', chainFenceAgg.line_post_loop_cap),
      row('rail_end', 'Rail end', chainFenceAgg.rail_end),
      row('rail', `Rail (total ft ÷ ${chainRailFt || '10'}')`, chainFenceAgg.rail),
      row('center_band', 'Center band', chainFenceAgg.center_band),
      row('offset_band', 'Offset band', chainFenceAgg.offset_band),
      row('tension_bar', 'Tension bar', chainFenceAgg.tension_bar),
      row('mesh', `Mesh rolls (total ft ÷ ${chainMeshFt || '50'}')`, chainFenceAgg.mesh),
      row('bottom_wire', 'Bottom wire (ft)', chainFenceAgg.bottom_wire),
      row('ties', 'Ties (est.)', chainFenceAgg.ties),
      row('carriage_bolt_nut', 'Carriage bolt + nut', chainFenceAgg.carriage_bolt_nut),
      row('hog_rings', 'Hog rings (note L/2)', chainFenceAgg.hog_rings_note),
    ];
  }, [chainFenceAgg, chainExtras, chainRailFt, chainMeshFt]);

  /** Chain gate totals (with extra items added). */
  const chainGateRows = useMemo(() => {
    const ex = (k: string) => styleExtraValue(chainExtras, k);
    const base = chainGateAgg ?? {
      pre_assembled_frame: 0,
      post: 0,
      end_post_cap: 0,
      gate_extension_kit: 0,
      hardware_kit: 0,
    };
    const rows = [
      { key: 'gate_frame', label: 'Pre-assembled frame', qty: base.pre_assembled_frame + ex('gate_frame') },
      { key: 'gate_post', label: 'Post', qty: base.post + ex('gate_post') },
      { key: 'gate_end_post_cap', label: 'End post cap', qty: base.end_post_cap + ex('gate_end_post_cap') },
      { key: 'gate_extension_kit', label: 'Gate extension kit', qty: base.gate_extension_kit + ex('gate_extension_kit') },
      { key: 'gate_hardware_kit', label: 'Hardware kit', qty: base.hardware_kit + ex('gate_hardware_kit') },
    ];
    return rows.some((r) => r.qty > 0) ? rows : null;
  }, [chainGateAgg, chainExtras]);

  /** One combined chain link master list: fence + gate items, ready for the table / PDF / quote. */
  const chainMasterRows = useMemo(() => {
    if (!chainFenceRows) return null;
    return [
      ...chainFenceRows,
      ...(chainGateRows ?? []).map((r) => ({ ...r, label: `Gate — ${r.label}` })),
    ];
  }, [chainFenceRows, chainGateRows]);

  const buildChainLinkMaterialListPdfBlob = useCallback(async (): Promise<{ blob: Blob; filename: string }> => {
    if (!chainFenceRows || !chainFenceAgg) {
      throw new Error('Add chain link fence lines before generating the PDF.');
    }
    const ex = (k: string) => styleExtraValue(chainExtras, k);
    const fmt = (n: number) => {
      const r = Math.round(n * 100) / 100;
      return Number.isFinite(r) ? String(r) : '';
    };
    const itemRows = [
      ...chainFenceRows
        .filter((r) => r.qty > 0 && isMaterialIncluded(materialExclusions, 'chain', r.label))
        .map((r) => ({ key: r.key, label: r.label, qty: r.qty })),
      ...(chainGateRows ?? [])
        .filter((r) => r.qty > 0 && isMaterialIncluded(materialExclusions, 'chain', `Gate — ${r.label}`))
        .map((r) => ({ key: r.key, label: `Gate — ${r.label}`, qty: r.qty })),
    ];
    const { large, small } = splitWare(itemRows, (r) => r.label);
    const toPdfRow = (r: { key: string; label: string; qty: number }, section: 'structure' | 'hardware') => ({
      label: r.label,
      adobe: fmt(r.qty),
      packs: '',
      extras: ex(r.key) > 0 ? fmt(ex(r.key)) : '',
      section,
    });
    const { finalizePdfRowsForPicking } = await import('@/lib/master-material-list-pdf-data');
    const pdfRows = finalizePdfRowsForPicking([
      { label: LARGE_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
      ...large.map((r) => toPdfRow(r, 'structure')),
      { label: SMALL_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
      ...small.map((r) => toPdfRow(r, 'hardware')),
      { label: '', adobe: '', packs: '', extras: '', section: 'spacer' as const },
      { label: 'Total Linear Ft', adobe: fmt(chainFenceAgg.total_linear_ft), packs: '', extras: '', section: 'totals' as const },
      { label: 'Total Gates', adobe: fmt(chainGateResults.length), packs: '', extras: '', section: 'totals' as const },
      { label: 'Total B4 Tax', adobe: '', packs: '', extras: '', section: 'taxRow' as const },
    ]);
    const [{ pdf }, { MasterMaterialListPdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/lib/master-material-list-pdf-document'),
    ]);
    const blob = await pdf(
      <MasterMaterialListPdfDocument
        subtitle="Chain Link"
        addressLine={jobAddress.trim() || '—'}
        colourColumnTitle="Chain Link"
        rows={pdfRows}
      />
    ).toBlob();
    const slug = (jobAddress || 'chain-link-material-list')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 72);
    return { blob, filename: `${slug || 'chain-link-material-list'}.pdf` };
  }, [chainFenceRows, chainGateRows, chainFenceAgg, chainGateResults, chainExtras, jobAddress, materialExclusions]);

  const downloadChainMasterListPdf = useCallback(async () => {
    const { blob, filename } = await buildChainLinkMaterialListPdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [buildChainLinkMaterialListPdfBlob]);

  /** Hybrid horizontal — same fence/gate routing as PVC; hybrid Excel blocks for materials only. */
  const hybridHJob = useMemo(() => {
    const hasSketchGates = Boolean(layoutSketchData?.gate_placements?.length);
    const manualGates = [...hybHShortGates, ...hybHSingleGates, ...hybHDoubleGates];
    const sketchCtx = layoutSketchData?.segments?.length ? layoutSketchData : undefined;
    const effectiveTerms = resolveJobRunTerminations(
      hybHLines.map((r) => effectiveHybridRunEnds(r)),
      layoutSketchData
    );
    const sharedBoundaryDedup = detectSharedBoundaryDoubleCounts(
      hybHLines.map((r) => effectiveHybridRunEnds(r)),
      layoutSketchData
    );
    const runs = hybHLines.map((row, i) => {
      let input = buildInputForHybridLineRow(
        row,
        sketchCtx ? { segmentIndex: i, sketch: sketchCtx } : undefined,
        effectiveTerms[i]
      );
      if (input) {
        input = {
          ...input,
          length_ft: subtractManualHybridGateWidthFt(
            i,
            input.length_ft,
            hybHLines.length,
            manualGates,
            hasSketchGates
          ),
        };
      }
      if (!input || input.length_ft <= 0) {
        return { row, result: null as null | ReturnType<typeof computeHybridHorizontalFence> };
      }
      return {
        row,
        result: computeHybridHorizontalFence(
          { length_ft: input.length_ft, h_post: input.h_post, u_channel: input.u_channel },
          hybHCalculatorFamily,
          hybHHeight
        ),
      };
    });
    const classified = classifyHybridHGateInputs(hybHShortGates, hybHSingleGates, hybHDoubleGates);
    const gates = classified.map((gate) => ({
      gate,
      rows: computeHybridHorizontalGateBlockRows(gate, hybHCalculatorFamily, hybHHeight),
    }));
    const totals = applySharedBoundaryDedupToHybridRows(
      sumFmsHybridRows([
        ...runs.filter((r) => r.result).map((r) => r.result!.rows),
        ...gates.filter((g) => g.rows).map((g) => g.rows!),
      ]),
      sharedBoundaryDedup
    );
    const master = applyHybridExtras(buildFmsHybridMasterList(totals, 'horizontal'), HYBRID_H_EXTRA_ITEMS, hybHExtras);
    const hasAny = runs.some((r) => r.result) || gates.some((g) => g.rows?.length);
    return { runs, gates, totals, master, hasAny };
  }, [
    hybHLines,
    hybHShortGates,
    hybHSingleGates,
    hybHDoubleGates,
    hybHBoardMaterial,
    hybHHeight,
    hybHExtras,
    layoutSketchData,
    hybHCalculatorFamily,
  ]);

  /** Hybrid vertical — same fence/gate routing as PVC; 6'4" hybrid PVC sheet for materials. */
  const hybridVJob = useMemo(() => {
    const hasSketchGates = Boolean(layoutSketchData?.gate_placements?.length);
    const manualGates = [...hybVShortGates, ...hybVSingleGates, ...hybVDoubleGates];
    const sketchCtx = layoutSketchData?.segments?.length ? layoutSketchData : undefined;
    const effectiveTerms = resolveJobRunTerminations(
      hybVLines.map((r) => effectiveHybridRunEnds(r)),
      layoutSketchData
    );
    const sharedBoundaryDedup = detectSharedBoundaryDoubleCounts(
      hybVLines.map((r) => effectiveHybridRunEnds(r)),
      layoutSketchData
    );
    const runs = hybVLines.map((row, i) => {
      let input = buildInputForHybridLineRow(
        row,
        sketchCtx ? { segmentIndex: i, sketch: sketchCtx } : undefined,
        effectiveTerms[i]
      );
      if (input) {
        input = {
          ...input,
          length_ft: subtractManualHybridGateWidthFt(
            i,
            input.length_ft,
            hybVLines.length,
            manualGates,
            hasSketchGates
          ),
        };
      }
      if (!input || input.length_ft <= 0) {
        return { row, result: null as null | ReturnType<typeof computeHybridVerticalPvc64Fence> };
      }
      return {
        row,
        result: computeHybridVerticalPvc64Fence({
          length_ft: input.length_ft,
          h_post: input.h_post,
          u_channel: input.u_channel,
        }),
      };
    });
    const classified = classifyHybridVGateInputs(hybVShortGates, hybVSingleGates, hybVDoubleGates);
    const gates = classified.map((gate) => ({
      gate,
      rows: computeHybridVerticalGateBlockRows(gate),
    }));
    const totals = applySharedBoundaryDedupToHybridRows(
      sumFmsHybridRows([
        ...runs.filter((r) => r.result).map((r) => r.result!.rows),
        ...gates.filter((g) => g.rows).map((g) => g.rows!),
      ]),
      sharedBoundaryDedup
    );
    const master = applyHybridExtras(buildFmsHybridMasterList(totals, 'vertical'), HYBRID_V_EXTRA_ITEMS, hybVExtras);
    const hasAny = runs.some((r) => r.result) || gates.some((g) => g.rows?.length);
    return { runs, gates, totals, master, hasAny };
  }, [hybVLines, hybVShortGates, hybVSingleGates, hybVDoubleGates, hybVExtras, layoutSketchData]);

  const buildHybridMaterialListPdfBlob = useCallback(
    async (which: 'h' | 'v'): Promise<{ blob: Blob; filename: string }> => {
      const job = which === 'h' ? hybridHJob : hybridVJob;
      if (!job.hasAny) {
        throw new Error('Add hybrid fence lines before generating the PDF.');
      }
      const defs = which === 'h' ? HYBRID_H_EXTRA_ITEMS : HYBRID_V_EXTRA_ITEMS;
      const values = which === 'h' ? hybHExtras : hybVExtras;
      const lines = which === 'h' ? hybHLines : hybVLines;
      const colour =
        which === 'h'
          ? hybridHExportColour(hybHBoardMaterial, hybridColour)
          : fmsHybridColourExportLabel('vertical', hybVMaterial, hybridColour);
      const subtitle =
        which === 'h'
          ? `${fmsHybridHoBoardMaterialLabel(hybHBoardMaterial)} hybrid — ${hybHHeight}' tall`
          : FMS_HYBRID_VE_BLOCK_TITLE;

      const extrasByItem = new Map<string, number>();
      for (const def of defs) {
        const v = styleExtraValue(values, def.key);
        if (v <= 0 || !def.targets) continue;
        for (const t of def.targets) {
          const k = t.item.toLowerCase();
          extrasByItem.set(k, (extrasByItem.get(k) ?? 0) + v * t.per);
        }
      }

      const linearFt = lines.reduce((a, r) => a + (Number(String(r.length_ft).replace(/,/g, '')) || 0), 0);
      const gateCount = job.gates.filter((g) => g.rows).length;
      const fmt = (n: number) => String(Math.round(n * 100) / 100);
      const matTab: MaterialCalcTab = which === 'h' ? 'hybrid_h' : 'hybrid_v';
      const includedMaster = job.master.filter(
        (r) => r.final > 0 && isMaterialIncluded(materialExclusions, matTab, r.item)
      );
      const { large, small } = splitWare(includedMaster, (r) => r.item);
      const toPdfRow = (r: FmsHybridItemRow, section: 'structure' | 'hardware') => ({
        label: r.item,
        adobe: fmt(r.final),
        packs: '',
        extras: extrasByItem.get(r.item.toLowerCase()) ? fmt(extrasByItem.get(r.item.toLowerCase())!) : '',
        section,
      });
      const { finalizePdfRowsForPicking } = await import('@/lib/master-material-list-pdf-data');
      const pdfRows = finalizePdfRowsForPicking([
        { label: LARGE_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
        ...large.map((r) => toPdfRow(r, 'structure')),
        { label: SMALL_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
        ...small.map((r) => toPdfRow(r, 'hardware')),
        { label: '', adobe: '', packs: '', extras: '', section: 'spacer' as const },
        { label: 'Total Linear Ft', adobe: fmt(linearFt), packs: '', extras: '', section: 'totals' as const },
        { label: 'Total Gates', adobe: fmt(gateCount), packs: '', extras: '', section: 'totals' as const },
        { label: 'Total B4 Tax', adobe: '', packs: '', extras: '', section: 'taxRow' as const },
      ]);

      const [{ pdf }, { MasterMaterialListPdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/master-material-list-pdf-document'),
      ]);
      const blob = await pdf(
        <MasterMaterialListPdfDocument
          subtitle={subtitle}
          addressLine={jobAddress.trim() || '—'}
          colourColumnTitle={colour}
          rows={pdfRows}
        />
      ).toBlob();
      const slug = (jobAddress || `hybrid-${which === 'h' ? 'horizontal' : 'vertical'}-material-list`)
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 72);
      return { blob, filename: `${slug || 'hybrid-material-list'}.pdf` };
    },
    [
      hybridHJob,
      hybridVJob,
      hybHExtras,
      hybVExtras,
      hybHLines,
      hybVLines,
      hybridColour,
      hybHBoardMaterial,
      hybVMaterial,
      hybHHeight,
      jobAddress,
      materialExclusions,
    ]
  );

  const downloadHybridMasterListPdf = useCallback(
    async (which: 'h' | 'v') => {
      const { blob, filename } = await buildHybridMaterialListPdfBlob(which);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [buildHybridMaterialListPdfBlob]
  );

  const buildSupplierMaterialQuoteLines = useCallback((): MaterialQuoteLine[] => {
    const rows: MaterialQuoteLine[] = [];
    const add = (description: string, qty: unknown) => {
      const q = typeof qty === 'number' ? qty : Number(qty);
      if (!description.trim() || !Number.isFinite(q) || q === 0) return;
      rows.push({ description: description.trim(), qty: q });
    };

    if (tab === 'pvc') {
      const pdfRows = buildMasterMaterialListPdfRows(
        pvcAdobe,
        extrasParsed,
        gateCount,
        pvcFenceLinearFt,
        pvcPercentUplifts,
        fmsRecipe
      );
      for (const r of pdfRows) {
        if (r.section === 'wareHeader' || r.section === 'taxRow' || r.section === 'spacer') continue;
        if (!r.label?.trim()) continue;
        if (!isMaterialIncluded(materialExclusions, 'pvc', r.label)) continue;
        const qty = Number(String(r.adobe).replace(/^\+/, '')) || 0;
        if (r.section === 'totals') {
          add(r.label, qty);
          continue;
        }
        if (qty <= 0) continue;
        add(r.label, qty);
      }
      return rows;
    }

    if (tab === 'chain') {
      if (chainFenceRows) {
        chainFenceRows.forEach((r) => {
          if (isMaterialIncluded(materialExclusions, 'chain', r.label)) {
            add(r.label, r.qty);
          }
        });
      }
      if (chainGateRows) {
        chainGateRows.forEach((r) => {
          const label = `Gate — ${r.label}`;
          if (isMaterialIncluded(materialExclusions, 'chain', label)) {
            add(label, r.qty);
          }
        });
      }
      return rows;
    }

    if (tab === 'hybrid_h' && hybridHJob.hasAny) {
      for (const r of hybridHJob.master) {
        if (isMaterialIncluded(materialExclusions, 'hybrid_h', r.item)) {
          add(r.item, r.final);
        }
      }
    }

    if (tab === 'hybrid_v' && hybridVJob.hasAny) {
      for (const r of hybridVJob.master) {
        if (isMaterialIncluded(materialExclusions, 'hybrid_v', r.item)) {
          add(r.item, r.final);
        }
      }
    }

    return rows;
  }, [
    tab,
    pvcAdobe,
    extrasParsed,
    gateCount,
    pvcFenceLinearFt,
    pvcPercentUplifts,
    fmsRecipe,
    chainFenceRows,
    chainGateRows,
    hybridHJob,
    hybridVJob,
    materialExclusions,
  ]);

  const quoteExportMeta = useMemo(() => {
    const job = jobAddress.trim();
    let colour = '';
    if (tab === 'pvc') colour = pvcBreakdownColour;
    else if (tab === 'chain') colour = 'Chain link';
    else if (tab === 'hybrid_h') colour = hybridHExportColour(hybHBoardMaterial, hybridColour);
    else if (tab === 'hybrid_v') {
      colour = fmsHybridColourExportLabel('vertical', hybVMaterial, hybridColour);
    }
    return {
      ...(job ? { job_site_address: job } : {}),
      ...(colour ? { calculator_fence_colour: colour } : {}),
    };
  }, [jobAddress, tab, pvcBreakdownColour, hybridColour, hybHBoardMaterial, hybVMaterial]);

  const activeTabMaterialListPdfAvailable = useMemo(() => {
    if (fmsQuoteMaterialUnsupported) return false;
    if (tab === 'pvc') return true;
    if (tab === 'chain') return Boolean(chainFenceRows);
    if (tab === 'hybrid_h') return hybridHJob.hasAny;
    if (tab === 'hybrid_v') return hybridVJob.hasAny;
    return false;
  }, [tab, fmsQuoteMaterialUnsupported, chainFenceRows, hybridHJob.hasAny, hybridVJob.hasAny]);

  const buildActiveTabMaterialListPdfBlob = useCallback(async (): Promise<{ blob: Blob; filename: string }> => {
    if (tab === 'pvc') return buildMasterMaterialListPdfBlob();
    if (tab === 'chain') return buildChainLinkMaterialListPdfBlob();
    if (tab === 'hybrid_h') return buildHybridMaterialListPdfBlob('h');
    if (tab === 'hybrid_v') return buildHybridMaterialListPdfBlob('v');
    throw new Error('Switch to a material tab with takeoff before generating the PDF.');
  }, [
    tab,
    buildMasterMaterialListPdfBlob,
    buildChainLinkMaterialListPdfBlob,
    buildHybridMaterialListPdfBlob,
  ]);

  const downloadActiveTabMaterialListPdf = useCallback(async () => {
    const { blob, filename } = await buildActiveTabMaterialListPdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [buildActiveTabMaterialListPdfBlob]);

  function addLine() {
    setLines((p) => [
      ...p,
      {
        id: newLineId(),
        label: `Line ${p.length + 1}`,
        length_ft: '',
        panel_module: pvcPanelModule,
        end_preset: 'h_continuous',
        h_post_type: 1,
        u_channel: '0',
      },
    ]);
  }

  function syncSketchSegmentLengthMetadata(segmentIndex: number, lengthFt: number) {
    const sketch = layoutSketchDataRef.current;
    if (!sketch?.segments?.length) return;
    if (segmentIndex < 0 || segmentIndex >= sketch.segments.length) return;
    if (lengthFt <= 0) return;
    const segments = sketch.segments.map((s, i) =>
      i === segmentIndex ? { ...s, length_ft: Math.round(lengthFt * 100) / 100 } : s
    );
    const total = segments.reduce((a, s) => a + (Number(s.length_ft) || 0), 0);
    programmaticSketchUpdateAtRef.current = Date.now();
    queueMicrotask(() => {
      setLayoutSketchData({ ...sketch, segments, total_length_ft: Math.round(total * 100) / 100 });
      setLayoutCanvasRemountKey((k) => k + 1);
    });
  }

  function updateLine(id: string, patch: Partial<PvcLineRow>) {
    const endEdit =
      'run_ends' in patch ||
      'end_preset' in patch ||
      'h_post_type' in patch ||
      'u_channel' in patch;
    let mergedPatch = patch;
    if (endEdit) {
      mergedPatch = { ...patch, manualRunEdit: true, end_preset: 'custom' as const };
      if (patch.run_ends) {
        const { d6, d7 } = d6d7FromRunEnds(patch.run_ends);
        mergedPatch = {
          ...mergedPatch,
          h_post_type: d6 as 0 | 1 | 2,
          u_channel: String(d7),
        };
      }
    }
    setLines((rows) => {
      const next = rows.map((r) => (r.id === id ? { ...r, ...mergedPatch } : r));
      if ('length_ft' in patch) {
        const idx = next.findIndex((r) => r.id === id);
        if (idx >= 0 && next[idx].fromSketch) {
          const newL = Math.max(0, Number(String(next[idx].length_ft).replace(/,/g, '')) || 0);
          if (newL > 0) syncSketchSegmentLengthMetadata(idx, newL);
        }
      }
      return next;
    });
  }

  function updateLineRunEnd(
    id: string,
    which: 'start' | 'end',
    field: 'h_post' | 'u_channel',
    checked: boolean
  ) {
    setLines((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      const row = rows[idx];
      const ends = effectiveRunEnds(row);
      const nextEnds: SegmentRunEnds = {
        ...ends,
        [which]: { ...ends[which], [field]: checked },
      };
      const { d6, d7 } = d6d7FromRunEnds(nextEnds);
      const next = [...rows];
      next[idx] = {
        ...row,
        run_ends: nextEnds,
        end_preset: 'custom',
        h_post_type: d6 as 0 | 1 | 2,
        u_channel: String(d7),
        manualRunEdit: true,
      };
      return next;
    });
  }

  function applyRunEndPreset(id: string, preset: LineEndPreset) {
    let run_ends: SegmentRunEnds;
    if (preset === 'h_continuous') {
      run_ends = {
        start: { h_post: true, u_channel: false },
        end: { h_post: true, u_channel: false },
      };
    } else if (preset === 'u_at_end') {
      run_ends = {
        start: { h_post: false, u_channel: true },
        end: { h_post: true, u_channel: false },
      };
    } else {
      return;
    }
    const { d6, d7 } = d6d7FromRunEnds(run_ends);
    updateLine(id, {
      end_preset: preset,
      run_ends,
      h_post_type: d6 as 0 | 1 | 2,
      u_channel: String(d7),
      manualRunEdit: true,
    });
  }

  function isGateOpeningFenceRow(label: string): boolean {
    const l = label.toLowerCase();
    return l.includes(' gate') && !l.includes('left') && !l.includes('right');
  }

  function updateChainLine(id: string, patch: Partial<ChainLineRow>) {
    const endEdit = 'run_ends' in patch || 'terminal_post' in patch;
    let mergedPatch = patch;
    if (endEdit) {
      mergedPatch = { ...patch, manualRunEdit: true };
      if (patch.run_ends) {
        const { d6 } = d6d7FromRunEnds(patch.run_ends);
        mergedPatch = { ...mergedPatch, terminal_post: String(d6) };
      }
    }
    setChainLines((rows) => {
      const next = rows.map((r) => (r.id === id ? { ...r, ...mergedPatch } : r));
      if ('length_ft' in patch) {
        const idx = next.findIndex((r) => r.id === id);
        if (idx >= 0 && next[idx].fromSketch) {
          const newL = Math.max(0, Number(String(next[idx].length_ft).replace(/,/g, '')) || 0);
          if (newL > 0) syncSketchSegmentLengthMetadata(idx, newL);
        }
      }
      return next;
    });
  }

  function updateHybridLine(
    which: 'h' | 'v',
    id: string,
    patch: Partial<HybridLineRow>
  ) {
    const endEdit = 'run_ends' in patch || 'h_post' in patch || 'u_channel' in patch;
    let mergedPatch = patch;
    if (endEdit) {
      mergedPatch = { ...patch, manualRunEdit: true };
      if (patch.run_ends) {
        const { d6, d7 } = d6d7FromRunEnds(patch.run_ends);
        mergedPatch = {
          ...mergedPatch,
          h_post: d6,
          u_channel: Math.max(0, Math.min(2, Math.round(d7))) as 0 | 1 | 2,
        };
      }
    }
    const setter = which === 'h' ? setHybHLines : setHybVLines;
    setter((rows) => {
      const next = rows.map((r) => (r.id === id ? { ...r, ...mergedPatch } : r));
      if ('length_ft' in patch) {
        const idx = next.findIndex((r) => r.id === id);
        if (idx >= 0 && next[idx].fromSketch) {
          const newL = Math.max(0, Number(String(next[idx].length_ft).replace(/,/g, '')) || 0);
          if (newL > 0) syncSketchSegmentLengthMetadata(idx, newL);
        }
      }
      return next;
    });
  }

  function updateHybHLine(id: string, patch: Partial<HybridLineRow>) {
    updateHybridLine('h', id, patch);
  }

  function updateHybVLine(id: string, patch: Partial<HybridLineRow>) {
    updateHybridLine('v', id, patch);
  }

  function updateChainLineRunEnd(
    id: string,
    which: 'start' | 'end',
    field: 'h_post' | 'u_channel',
    checked: boolean
  ) {
    if (field === 'u_channel') return;
    setChainLines((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      const row = rows[idx];
      const ends = effectiveChainRunEnds(row);
      const nextEnds: SegmentRunEnds = {
        ...ends,
        [which]: { ...ends[which], h_post: checked },
      };
      const { d6 } = d6d7FromRunEnds(nextEnds);
      const next = [...rows];
      next[idx] = {
        ...row,
        run_ends: nextEnds,
        terminal_post: String(d6),
        manualRunEdit: true,
      };
      return next;
    });
  }

  function updateHybridLineRunEnd(
    which: 'h' | 'v',
    id: string,
    side: 'start' | 'end',
    field: 'h_post' | 'u_channel',
    checked: boolean
  ) {
    const setter = which === 'h' ? setHybHLines : setHybVLines;
    setter((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      const row = rows[idx];
      const ends = effectiveHybridRunEnds(row);
      const nextEnds: SegmentRunEnds = {
        ...ends,
        [side]: { ...ends[side], [field]: checked },
      };
      const { d6, d7 } = d6d7FromRunEnds(nextEnds);
      const next = [...rows];
      next[idx] = {
        ...row,
        run_ends: nextEnds,
        h_post: d6,
        u_channel: Math.max(0, Math.min(2, Math.round(d7))) as 0 | 1 | 2,
        manualRunEdit: true,
      };
      return next;
    });
  }

  function applyChainRunEndPreset(id: string, preset: LineEndPreset) {
    let run_ends: SegmentRunEnds;
    if (preset === 'h_continuous') {
      run_ends = {
        start: { h_post: true, u_channel: false },
        end: { h_post: true, u_channel: false },
      };
    } else if (preset === 'u_at_end') {
      run_ends = {
        start: { h_post: false, u_channel: false },
        end: { h_post: true, u_channel: false },
      };
    } else {
      return;
    }
    const { d6 } = d6d7FromRunEnds(run_ends);
    updateChainLine(id, { run_ends, terminal_post: String(d6), manualRunEdit: true });
  }

  function applyHybridRunEndPreset(which: 'h' | 'v', id: string, preset: LineEndPreset) {
    let run_ends: SegmentRunEnds;
    if (preset === 'h_continuous') {
      run_ends = {
        start: { h_post: true, u_channel: false },
        end: { h_post: true, u_channel: false },
      };
    } else if (preset === 'u_at_end') {
      run_ends = {
        start: { h_post: false, u_channel: true },
        end: { h_post: true, u_channel: false },
      };
    } else {
      return;
    }
    const { d6, d7 } = d6d7FromRunEnds(run_ends);
    updateHybridLine(which, id, {
      run_ends,
      h_post: d6,
      u_channel: Math.max(0, Math.min(2, Math.round(d7))) as 0 | 1 | 2,
      manualRunEdit: true,
    });
  }

  function renderFenceRunsSection(opts: {
    rows: { id: string; label: string; length_ft: string; fromSketch?: boolean; manualRunEdit?: boolean }[];
    getSubtitle: (row: { label: string }, idx: number) => string;
    getRunEnds: (row: { id: string }) => SegmentRunEnds;
    onLengthChange: (id: string, length_ft: string) => void;
    onRunEndChange: (
      id: string,
      which: 'start' | 'end',
      field: 'h_post' | 'u_channel',
      checked: boolean
    ) => void;
    onApplyPreset: (id: string, preset: LineEndPreset) => void;
    onRemove?: (id: string) => void;
    showUChannel?: boolean;
    embedded?: boolean;
    renderExpandedExtra?: (row: { id: string; label: string }, idx: number) => ReactNode;
    footer?: ReactNode;
  }) {
    const showU = opts.showUChannel !== false;
    const body = (
      <div className={opts.embedded ? 'space-y-2' : 'space-y-3 p-5'}>
        {opts.embedded ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fence runs</p>
        ) : null}
        {opts.rows.map((row, idx) => {
          const expanded = !!expandedFenceRuns[row.id];
          const ends = opts.getRunEnds(row);
          const gateOpening = isGateOpeningFenceRow(row.label || `Run ${idx + 1}`);
          const lengthLabel = row.length_ft ? `${row.length_ft} ft` : '—';
          return (
            <div
              key={row.id}
              className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40 ring-1 ring-slate-900/[0.03]"
            >
              <button
                type="button"
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
                onClick={() =>
                  setExpandedFenceRuns((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                }
                aria-expanded={expanded}
              >
                <span className="text-slate-400" aria-hidden>
                  {expanded ? '▾' : '▸'}
                </span>
                <div className="min-w-[8rem] flex-1">
                  <span className="text-sm font-semibold text-slate-800">
                    {row.label || `Run ${idx + 1}`}
                  </span>
                  {!opts.embedded ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {opts.getSubtitle(row, idx)}
                      {!gateOpening && expanded ? ` · ${runEndsSummary(ends)}` : ''}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-500">{lengthLabel}</p>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                    Length (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.length_ft}
                    onChange={(e) => opts.onLengthChange(row.id, e.target.value)}
                    className={`${field} w-28`}
                  />
                </div>
                {!opts.embedded && row.fromSketch && !row.manualRunEdit ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                    From sketch
                  </span>
                ) : !opts.embedded && row.manualRunEdit ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                    Ends edited
                  </span>
                ) : null}
                {!row.fromSketch && opts.onRemove ? (
                  <button
                    type="button"
                    className={`${btnGhost} shrink-0`}
                    onClick={(e) => {
                      e.stopPropagation();
                      opts.onRemove!(row.id);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </button>
                {expanded ? (
                  <div className="border-t border-slate-100 bg-white px-4 py-4">
                    {gateOpening ? (
                      <p className="text-sm text-slate-600">
                        Gate openings use gate materials — post settings apply to fence runs only.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => opts.onApplyPreset(row.id, 'h_continuous')}
                          >
                            Standard (post each end)
                          </button>
                          {showU ? (
                            <button
                              type="button"
                              className={btnGhost}
                              onClick={() => opts.onApplyPreset(row.id, 'u_at_end')}
                            >
                              Butts to existing (U at start)
                            </button>
                          ) : null}
                        </div>
                        <details className="rounded-lg border border-slate-200 bg-slate-50/30">
                          <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
                            Advanced connection settings
                          </summary>
                          <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-3">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Start of run
                                </div>
                                <div className="space-y-2">
                                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-300"
                                      checked={ends.start.h_post}
                                      onChange={(e) =>
                                        opts.onRunEndChange(row.id, 'start', 'h_post', e.target.checked)
                                      }
                                    />
                                    End post
                                  </label>
                                  {showU ? (
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300"
                                        checked={ends.start.u_channel}
                                        onChange={(e) =>
                                          opts.onRunEndChange(row.id, 'start', 'u_channel', e.target.checked)
                                        }
                                      />
                                      Wall channel (U)
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  End of run
                                </div>
                                <div className="space-y-2">
                                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-300"
                                      checked={ends.end.h_post}
                                      onChange={(e) =>
                                        opts.onRunEndChange(row.id, 'end', 'h_post', e.target.checked)
                                      }
                                    />
                                    End post
                                  </label>
                                  {showU ? (
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300"
                                        checked={ends.end.u_channel}
                                        onChange={(e) =>
                                          opts.onRunEndChange(row.id, 'end', 'u_channel', e.target.checked)
                                        }
                                      />
                                      Wall channel (U)
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            {showU ? (
                              <p className="text-xs text-slate-500">
                                Tying into existing fence? Turn off the end post at the start and enable wall channel
                                there.
                              </p>
                            ) : null}
                          </div>
                        </details>
                        {opts.renderExpandedExtra?.(row, idx)}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          {opts.footer}
        </div>
    );
    if (opts.embedded) return body;
    return (
      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
          <h2 className={h2}>Fence runs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Lengths from your sketch. Expand a run only if you need to change connections.
          </p>
        </div>
        {body}
      </section>
    );
  }

  function applySketchGateWidth(placementIndex: number, widthInStr: string) {
    const sketch = layoutSketchDataRef.current;
    if (!sketch?.gate_placements?.length) return;
    if (placementIndex < 0 || placementIndex >= sketch.gate_placements.length) return;

    const n = Number(String(widthInStr).replace(/,/g, '').trim());
    const width_in = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
    const wStr = width_in != null ? String(width_in) : '';

    const gate_placements = sketch.gate_placements.map((p, i) => {
      if (i !== placementIndex) return p;
      if (width_in == null) {
        const { width_in: _drop, ...rest } = p;
        return rest;
      }
      return { ...p, width_in };
    });

    const syncWidth = <T extends { sketchPlacementIndex?: number; width_in: string }>(rows: T[]) =>
      rows.map((r) =>
        r.sketchPlacementIndex === placementIndex ? { ...r, width_in: wStr } : r
      );

    setShortGates(syncWidth);
    setSingleGates(syncWidth);
    setDoubleGates(syncWidth);
    setChainGates(syncWidth);
    setHybVShortGates(syncWidth);
    setHybVSingleGates(syncWidth);
    setHybVDoubleGates(syncWidth);
    setHybHShortGates(syncWidth);
    setHybHSingleGates(syncWidth);
    setHybHDoubleGates(syncWidth);

    sketchToLinesSyncKeyRef.current = '';
    setLayoutSketchData({ ...sketch, gate_placements });
  }

  function removeSketchLinkedGate(placementIndex: number) {
    const sketch = layoutSketchDataRef.current;
    if (!sketch?.gate_placements?.length) return;
    if (placementIndex < 0 || placementIndex >= sketch.gate_placements.length) return;

    const updated = removeLayoutDrawingGatePlacement(sketch, placementIndex);
    if (!updated) return;

    setShortGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setSingleGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setDoubleGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setChainGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybVShortGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybVSingleGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybVDoubleGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybHShortGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybHSingleGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybHDoubleGates((rows) => shiftGatePlacementIndices(rows, placementIndex));

    sketchSyncedGatePlacementCountRef.current = updated.gate_placements?.length ?? 0;
    sketchToLinesSyncKeyRef.current = '';
    queueMicrotask(() => {
      setLayoutSketchData(updated as LayoutSketchDrawingPayload);
      setLayoutCanvasRemountKey((k) => k + 1);
    });
  }

  function syncSketchAfterSegmentRemoved(segmentIndex: number) {
    const sketch = layoutSketchDataRef.current;
    if (!sketch?.segments?.length || segmentIndex < 0 || segmentIndex >= sketch.segments.length) return;
    const updated =
      sketch.segments.length === 1
        ? {
            ...sketch,
            points: [],
            segments: [],
            gates: [],
            gate_placements: [],
            joint_terminations: undefined,
            total_length_ft: 0,
          }
        : removeLayoutDrawingSegment(sketch, segmentIndex);
    if (!updated) return;
    sketchToLinesSyncKeyRef.current = '';
    queueMicrotask(() => {
      setLayoutSketchData(updated as LayoutSketchDrawingPayload);
      setLayoutCanvasRemountKey((k) => k + 1);
    });
  }

  function removeLine(id: string) {
    setLines((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      syncSketchAfterSegmentRemoved(idx);
      return rows.filter((r) => r.id !== id);
    });
  }

  function removeChainLine(id: string) {
    setChainLines((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      syncSketchAfterSegmentRemoved(idx);
      return rows.filter((r) => r.id !== id);
    });
  }

  function removeHybVLine(id: string) {
    setHybVLines((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      syncSketchAfterSegmentRemoved(idx);
      return rows.filter((r) => r.id !== id);
    });
  }

  function removeHybHLine(id: string) {
    setHybHLines((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return rows;
      syncSketchAfterSegmentRemoved(idx);
      return rows.filter((r) => r.id !== id);
    });
  }

  function addPvcGate(kind: 'short' | 'single' | 'double') {
    const row = emptyGateRow(kind);
    if (kind === 'short') setShortGates((p) => [...p, row]);
    else if (kind === 'single') setSingleGates((p) => [...p, row]);
    else setDoubleGates((p) => [...p, row]);
  }

  function updatePvcGate(
    kind: 'short' | 'single' | 'double',
    id: string,
    patch: Partial<PvcGateRow>
  ) {
    if ('width_in' in patch) {
      const rows = kind === 'short' ? shortGates : kind === 'single' ? singleGates : doubleGates;
      const row = rows.find((r) => r.id === id);
      if (row?.sketchPlacementIndex != null) {
        applySketchGateWidth(row.sketchPlacementIndex, String(patch.width_in ?? ''));
        if (Object.keys(patch).length === 1) return;
      }
    }
    const fn = (rows: PvcGateRow[]) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    if (kind === 'short') setShortGates(fn);
    else if (kind === 'single') setSingleGates(fn);
    else setDoubleGates(fn);
  }

  function removePvcGate(kind: 'short' | 'single' | 'double', id: string) {
    const rows = kind === 'short' ? shortGates : kind === 'single' ? singleGates : doubleGates;
    const row = rows.find((r) => r.id === id);
    if (row?.sketchPlacementIndex != null) {
      removeSketchLinkedGate(row.sketchPlacementIndex);
      return;
    }
    const fn = (gateRows: PvcGateRow[]) => gateRows.filter((r) => r.id !== id);
    if (kind === 'short') setShortGates(fn);
    else if (kind === 'single') setSingleGates(fn);
    else setDoubleGates(fn);
  }

  function removeChainGate(id: string) {
    const row = chainGates.find((r) => r.id === id);
    if (row?.sketchPlacementIndex != null) {
      removeSketchLinkedGate(row.sketchPlacementIndex);
      return;
    }
    setChainGates((rows) => rows.filter((r) => r.id !== id));
  }

  function addHybVGate(kind: 'short' | 'single' | 'double') {
    const row: HybridVFenceGateRow = {
      id: newLineId(),
      width_in: defaultPvcGateWidthIn(kind),
      posts: FMS_GATE_POST_COUNT,
    };
    if (kind === 'short') setHybVShortGates((p) => [...p, row]);
    else if (kind === 'single') setHybVSingleGates((p) => [...p, row]);
    else setHybVDoubleGates((p) => [...p, row]);
  }

  function updateHybVGate(kind: 'short' | 'single' | 'double', id: string, patch: Partial<HybridVFenceGateRow>) {
    if ('width_in' in patch) {
      const rows = kind === 'short' ? hybVShortGates : kind === 'single' ? hybVSingleGates : hybVDoubleGates;
      const row = rows.find((r) => r.id === id);
      if (row?.sketchPlacementIndex != null) {
        applySketchGateWidth(row.sketchPlacementIndex, String(patch.width_in ?? ''));
        if (Object.keys(patch).length === 1) return;
      }
    }
    const fn = (rows: HybridVFenceGateRow[]) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    if (kind === 'short') setHybVShortGates(fn);
    else if (kind === 'single') setHybVSingleGates(fn);
    else setHybVDoubleGates(fn);
  }

  function removeHybVGate(kind: 'short' | 'single' | 'double', id: string) {
    const rows = kind === 'short' ? hybVShortGates : kind === 'single' ? hybVSingleGates : hybVDoubleGates;
    const row = rows.find((r) => r.id === id);
    if (row?.sketchPlacementIndex != null) {
      removeSketchLinkedGate(row.sketchPlacementIndex);
      return;
    }
    const fn = (gateRows: HybridVFenceGateRow[]) => gateRows.filter((r) => r.id !== id);
    if (kind === 'short') setHybVShortGates(fn);
    else if (kind === 'single') setHybVSingleGates(fn);
    else setHybVDoubleGates(fn);
  }

  function addHybHGate(kind: 'short' | 'single' | 'double') {
    const row: HybridHFenceGateRow = {
      id: newLineId(),
      width_in: defaultPvcGateWidthIn(kind),
      posts: FMS_GATE_POST_COUNT,
      adjoining: 0,
    };
    if (kind === 'short') setHybHShortGates((p) => [...p, row]);
    else if (kind === 'single') setHybHSingleGates((p) => [...p, row]);
    else setHybHDoubleGates((p) => [...p, row]);
  }

  function updateHybHGate(kind: 'short' | 'single' | 'double', id: string, patch: Partial<HybridHFenceGateRow>) {
    if ('width_in' in patch) {
      const rows = kind === 'short' ? hybHShortGates : kind === 'single' ? hybHSingleGates : hybHDoubleGates;
      const row = rows.find((r) => r.id === id);
      if (row?.sketchPlacementIndex != null) {
        applySketchGateWidth(row.sketchPlacementIndex, String(patch.width_in ?? ''));
        if (Object.keys(patch).length === 1) return;
      }
    }
    const fn = (rows: HybridHFenceGateRow[]) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    if (kind === 'short') setHybHShortGates(fn);
    else if (kind === 'single') setHybHSingleGates(fn);
    else setHybHDoubleGates(fn);
  }

  function removeHybHGate(kind: 'short' | 'single' | 'double', id: string) {
    const rows = kind === 'short' ? hybHShortGates : kind === 'single' ? hybHSingleGates : hybHDoubleGates;
    const row = rows.find((r) => r.id === id);
    if (row?.sketchPlacementIndex != null) {
      removeSketchLinkedGate(row.sketchPlacementIndex);
      return;
    }
    const fn = (gateRows: HybridHFenceGateRow[]) => gateRows.filter((r) => r.id !== id);
    if (kind === 'short') setHybHShortGates(fn);
    else if (kind === 'single') setHybHSingleGates(fn);
    else setHybHDoubleGates(fn);
  }

  function renderUnifiedPvcGatesSection(opts?: { embedded?: boolean }) {
    const entries = [
      ...shortGates.map((row) => ({ kind: 'short' as const, row })),
      ...singleGates.map((row) => ({ kind: 'single' as const, row })),
      ...doubleGates.map((row) => ({ kind: 'double' as const, row })),
    ];
    const inner = (
      <div>
        {opts?.embedded ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gates</p>
            <button type="button" className={btnGhost} onClick={() => addPvcGate('single')}>
              + Add gate
            </button>
          </div>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">No gates on this job.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Gate</th>
                  <th className="px-3 py-2">Width (in)</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map(({ kind, row }, i) => {
                  const w = Math.max(0, Number(String(row.width_in).replace(/,/g, '')) || 0);
                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {i + 1}. {pvcGateLabelFromWidth(w)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={row.width_in}
                          onChange={(e) => updatePvcGate(kind, row.id, { width_in: e.target.value })}
                          className={`${field} w-28`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className={btnGhost} onClick={() => removePvcGate(kind, row.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
    if (opts?.embedded) return inner;
    return (
      <section ref={pvcGatesSectionRef} className={card}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className={h2}>Gates</h2>
            <button type="button" className={btnGhost} onClick={() => addPvcGate('single')}>
              + Add gate
            </button>
          </div>
        </div>
        <div className="p-5">{inner}</div>
      </section>
    );
  }

  function renderUnifiedHybridHGateSection(opts?: { embedded?: boolean }) {
    const entries = [
      ...hybHShortGates.map((row) => ({ kind: 'short' as const, row })),
      ...hybHSingleGates.map((row) => ({ kind: 'single' as const, row })),
      ...hybHDoubleGates.map((row) => ({ kind: 'double' as const, row })),
    ];
    const inner = (
      <div>
        {opts?.embedded ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gates</p>
            <button type="button" className={btnGhost} onClick={() => addHybHGate('single')}>
              + Add gate
            </button>
          </div>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">No gates on this job.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(({ kind, row }, i) => {
              const w = Math.max(0, Number(String(row.width_in).replace(/,/g, '')) || 0);
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-white p-3"
                >
                  <span className="min-w-[6rem] text-sm font-medium text-slate-800">
                    {i + 1}. {pvcGateLabelFromWidth(w)}
                  </span>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Width (in)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.width_in}
                      onChange={(e) => updateHybHGate(kind, row.id, { width_in: e.target.value })}
                      className={`${field} w-28`}
                    />
                  </div>
                  {kind !== 'short' ? (
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Ties in?</label>
                      <select
                        value={row.adjoining ?? 0}
                        onChange={(e) =>
                          updateHybHGate(kind, row.id, {
                            adjoining: Number(e.target.value) as 0 | 1 | 2,
                          })
                        }
                        className={`${field} w-36`}
                      >
                        <option value={0}>Yes</option>
                        <option value={1}>No</option>
                        {kind === 'single' ? <option value={2}>Middle</option> : null}
                      </select>
                    </div>
                  ) : null}
                  <button type="button" className={btnGhost} onClick={() => removeHybHGate(kind, row.id)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
    if (opts?.embedded) return inner;
    return (
      <section className={card}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className={h2}>Gates</h2>
            <button type="button" className={btnGhost} onClick={() => addHybHGate('single')}>
              + Add gate
            </button>
          </div>
        </div>
        <div className="p-5">{inner}</div>
      </section>
    );
  }

  function renderUnifiedHybridVGateSection(opts?: { embedded?: boolean }) {
    const entries = [
      ...hybVShortGates.map((row) => ({ kind: 'short' as const, row })),
      ...hybVSingleGates.map((row) => ({ kind: 'single' as const, row })),
      ...hybVDoubleGates.map((row) => ({ kind: 'double' as const, row })),
    ];
    const inner = (
      <div>
        {opts?.embedded ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gates</p>
            <button type="button" className={btnGhost} onClick={() => addHybVGate('single')}>
              + Add gate
            </button>
          </div>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">No gates on this job.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Gate</th>
                  <th className="px-3 py-2">Width (in)</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map(({ kind, row }, i) => {
                  const w = Math.max(0, Number(String(row.width_in).replace(/,/g, '')) || 0);
                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {i + 1}. {pvcGateLabelFromWidth(w)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={row.width_in}
                          onChange={(e) => updateHybVGate(kind, row.id, { width_in: e.target.value })}
                          className={`${field} w-28`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className={btnGhost} onClick={() => removeHybVGate(kind, row.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
    if (opts?.embedded) return inner;
    return (
      <section className={card}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className={h2}>Gates</h2>
            <button type="button" className={btnGhost} onClick={() => addHybVGate('single')}>
              + Add gate
            </button>
          </div>
        </div>
        <div className="p-5">{inner}</div>
      </section>
    );
  }

  function renderChainGatesEmbedded() {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gates</p>
          <button
            type="button"
            className={btnGhost}
            onClick={() =>
              setChainGates((g) => [
                ...g,
                { id: newLineId(), width_in: '', posts: FMS_GATE_POST_COUNT, opening_in: '45' },
              ])
            }
          >
            + Add gate
          </button>
        </div>
        {chainGates.length === 0 ? (
          <p className="text-sm text-slate-400">No gates on this job.</p>
        ) : (
          <div className="space-y-2">
            {chainGates.map((g, i) => (
              <div
                key={g.id}
                className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-white p-3"
              >
                <span className="text-sm font-medium text-slate-800">Gate {i + 1}</span>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Width (in)</label>
                  <input
                    type="number"
                    min={0}
                    value={g.width_in}
                    onChange={(e) => {
                      const w = e.target.value;
                      if (g.sketchPlacementIndex != null) {
                        applySketchGateWidth(g.sketchPlacementIndex, w);
                        return;
                      }
                      setChainGates((rows) => rows.map((r) => (r.id === g.id ? { ...r, width_in: w } : r)));
                    }}
                    className={`${field} w-24`}
                  />
                </div>
                <button type="button" className={btnGhost} onClick={() => removeChainGate(g.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const tuningDefaultOpen = useMemo(() => {
    if (!layoutSketchData?.segments?.length) return true;
    const rows =
      tab === 'pvc'
        ? lines
        : tab === 'chain'
          ? chainLines
          : tab === 'hybrid_h'
            ? hybHLines
            : tab === 'hybrid_v'
              ? hybVLines
              : [];
    return rows.some((r) => r.manualRunEdit) || rows.some((r) => !r.fromSketch);
  }, [tab, layoutSketchData, lines, chainLines, hybHLines, hybVLines]);

  return (
    <div className="relative mx-auto max-w-5xl pb-24">
      <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Material Calculator</h1>
        {importedMaterialRequest ? (
          <div className="mt-3 max-w-3xl">
            <MaterialQuoteImportBanner
              request={importedMaterialRequest}
              showContractorDetails={showSupplierMaterialRequest}
              quoteDetailHref={
                showSupplierMaterialRequest
                  ? `/dashboard/supplier/contractor-quotes/${encodeURIComponent(materialRequestId)}`
                  : undefined
              }
            />
          </div>
        ) : null}
        {fromMaterialQuoteId || materialRequestId ? (
          <div className="mt-3 max-w-3xl space-y-2">
            <div className="rounded-xl border border-violet-200/90 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
              {materialQuoteSketchLoadState === 'loading' ? (
                <span className="font-semibold">Loading layout from material request…</span>
              ) : (
                <>
                  <span className="font-semibold">Material request import.</span> The PVC tab loads the plan sketch or
                  map fence lines from this request when available.{' '}
                  <Link
                    href="/dashboard/material-calculator"
                    className="font-semibold text-violet-800 underline hover:text-violet-950"
                  >
                    Clear import
                  </Link>
                </>
              )}
            </div>
            {materialQuoteSketchLoadState === 'none' ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                No fence geometry was found on this material request (or the request could not be loaded). You can draw
                the plan or enter runs manually.
              </div>
            ) : null}
          </div>
        ) : null}
        {fromMaterialSketchSaveId && !fromMaterialQuoteId && !materialRequestId ? (
          <div className="mt-3 max-w-3xl space-y-2">
            <div className="rounded-xl border border-teal-200/90 bg-teal-50/90 px-4 py-3 text-sm text-teal-950">
              {profileSketchSaveLoadState === 'loading' ? (
                <span className="font-semibold">Loading saved map sketch…</span>
              ) : (
                <>
                  <span className="font-semibold">Saved material list.</span> This sketch came from your account
                  snapshots (address as title).{' '}
                  <Link
                    href="/dashboard/material-calculator"
                    className="font-semibold text-teal-900 underline hover:text-teal-950"
                  >
                    Clear import
                  </Link>
                </>
              )}
            </div>
            {profileSketchSaveLoadState === 'none' ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                That snapshot could not be loaded or no longer has drawing data.
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Draw your fence, pick a style, and get a parts list you can copy or print.
        </p>
      </div>

      {fmsQuoteMaterialUnsupported ? (
        <div className="max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">This material isn&apos;t supported yet</p>
          <p className="mt-2">
            This quote is recorded as <span className="font-medium text-slate-900">{fmsQuoteMaterialUnsupported}</span>.
            The material calculator currently covers PVC / vinyl, chain link, and hybrid fences.
          </p>
          <p className="mt-2 text-slate-700">Your layout sketch and job details above are still available for reference.</p>
          <Link
            href="/dashboard/material-calculator"
            className="mt-3 inline-block text-sm font-semibold text-amber-900 underline hover:text-amber-950"
          >
            Clear import and open a blank calculator
          </Link>
        </div>
      ) : null}

      {!fmsQuoteMaterialUnsupported ? (
      <>
      <div className={stageLabel}>
        <span>1 · Draw</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-violet-50/25 px-5 py-4">
          <h2 className={h2}>Draw your fence layout</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sketch each run and tap to drop in gates — lengths fill in automatically below.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex w-full flex-col gap-3">
            <LayoutDrawCanvas
              key={layoutCanvasRemountKey}
              fillParent={false}
              initialDrawing={
                layoutSketchData
                  ? {
                      points: layoutSketchData.points,
                      segments: layoutSketchData.segments,
                      gates: layoutSketchData.gates ?? [],
                      total_length_ft: layoutSketchData.total_length_ft,
                      gate_placements: layoutSketchData.gate_placements ?? [],
                      ...(layoutSketchData.joint_terminations?.length
                        ? { joint_terminations: layoutSketchData.joint_terminations }
                        : {}),
                    }
                  : null
              }
              onDrawingChange={handleLayoutDrawingChange}
            />
            {(lines.some((l) => l.fromSketch && !l.manualRunEdit) ||
              chainLines.some((l) => l.fromSketch && !l.manualRunEdit) ||
              hybHLines.some((l) => l.fromSketch && !l.manualRunEdit) ||
              hybVLines.some((l) => l.fromSketch && !l.manualRunEdit)) && (
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                Lengths and gates come from your sketch. Open &ldquo;Adjust lengths &amp; gates&rdquo; below only if you
                need to tweak something.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className={stageLabel}>
        <span>2 · Pick style</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <section className={card}>
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Fence style</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${tabBase} ${tab === 'pvc' ? tabActive : tabIdle}`}
                onClick={() => setTab('pvc')}
              >
                <span className="text-sm font-semibold">Vinyl fence</span>
              </button>
              <button
                type="button"
                className={`${tabBase} ${tab === 'chain' ? tabActive : tabIdle}`}
                onClick={() => setTab('chain')}
              >
                <span className="text-sm font-semibold">Chain link</span>
              </button>
              <button
                type="button"
                className={`${tabBase} ${tab === 'hybrid_h' ? tabActive : tabIdle}`}
                onClick={() => setTab('hybrid_h')}
              >
                <span className="text-sm font-semibold">Horizontal boards</span>
              </button>
              <button
                type="button"
                className={`${tabBase} ${tab === 'hybrid_v' ? tabActive : tabIdle}`}
                onClick={() => setTab('hybrid_v')}
              >
                <span className="text-sm font-semibold">Vertical panels</span>
              </button>
            </div>
          </div>
          {tab === 'pvc' ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 ring-1 ring-slate-900/[0.03]">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <div className="min-w-[10rem] flex-1 sm:max-w-[11rem]">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Panel height
                  </label>
                  <select
                    value={pvcPanelModule}
                    onChange={(e) => applyPvcPanelModule(e.target.value as FmsPvcPanelModule)}
                    className={`${field} w-full`}
                  >
                    {(Object.keys(FMS_PVC_PANEL_HEIGHT_LABELS) as FmsPvcPanelModule[]).map((m) => (
                      <option key={m} value={m}>
                        {FMS_PVC_PANEL_HEIGHT_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <details className="min-w-[12rem] flex-1 sm:max-w-md">
                  <summary className="cursor-pointer pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Custom post spacing
                  </summary>
                  <div className="mt-1 space-y-2">
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={pvcPanelSpacingFt}
                      onChange={(e) => setPvcPanelSpacingFt(e.target.value)}
                      className={`${field} w-full tabular-nums`}
                      aria-label="Post spacing in feet"
                    />
                    <p className="text-xs text-slate-500">
                      Default is {defaultFmsPvcPanelSpacingFt(pvcPanelModule).toFixed(2)} ft for{' '}
                      {FMS_PVC_PANEL_HEIGHT_LABELS[pvcPanelModule].toLowerCase()}.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job address/PO #
              </label>
              <input
                type="text"
                value={jobAddress}
                onChange={(e) => setJobAddress(e.target.value)}
                placeholder="e.g. 53 Rothesay Ave or PO 4821"
                className={`${field} w-full`}
              />
            </div>
            {tab === 'pvc' ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fence color
                </label>
                <select
                  value={pvcBreakdownColour}
                  onChange={(e) => setPvcBreakdownColour(e.target.value as FmsPvcCalculatorColour)}
                  className={`${field} w-full`}
                >
                  {FMS_PVC_CALCULATOR_COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          {tab === 'hybrid_h' ? (
            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Board material</label>
                <select
                  value={hybHBoardMaterial}
                  onChange={(e) => {
                    const board = coerceFmsHybridHoBoardMaterial(e.target.value);
                    setHybHBoardMaterial(board);
                    const colourLine = fmsHybridHoBoardMaterialColourLine(board);
                    if (colourLine) setHybridColour((c) => fmsHybridColourForMaterial(colourLine, c));
                  }}
                  className={`${field} w-full`}
                >
                  {FMS_HYBRID_HO_BOARD_MATERIALS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Height</label>
                <select
                  value={hybHHeight}
                  onChange={(e) => setHybHHeight(Number(e.target.value) === 7 ? 7 : 6)}
                  className={`${field} w-full`}
                >
                  <option value={6}>6&apos; tall</option>
                  <option value={7}>7&apos; tall</option>
                </select>
              </div>
              {hybridHHasColour ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Colour</label>
                  <HybridColourSelect
                    material={fmsHybridHoBoardMaterialColourLine(hybHBoardMaterial)!}
                    value={hybridColour}
                    onChange={setHybridColour}
                    className={`${field} w-full`}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {tab === 'hybrid_v' ? (
            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Panel material</label>
                <select
                  value={hybVMaterial}
                  onChange={(e) => {
                    const material = coerceHybridMaterialLine(e.target.value);
                    setHybVMaterial(material);
                    setHybridColour((c) => fmsHybridColourForMaterial(material, c));
                  }}
                  className={`${field} w-full`}
                >
                  {FMS_HYBRID_MATERIAL_LINES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Colour</label>
                <HybridColourSelect
                  material={hybVMaterial}
                  value={hybridColour}
                  onChange={setHybridColour}
                  className={`${field} w-full`}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {tab === 'pvc' && (
        <>
          {isSupplierAccount ? (
            <section className={card}>
              <div className="flex flex-wrap items-center gap-2 p-4">
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">PVC mode</span>
                <button
                  type="button"
                  className={`${tabBase} min-w-0 px-3 py-2 ${pvcHubMode === 'calculator' ? tabActive : tabIdle}`}
                  onClick={() => setPvcHubMode('calculator')}
                >
                  <span className="text-sm font-semibold">Calculator</span>
                </button>
                <button
                  type="button"
                  className={`${tabBase} min-w-0 px-3 py-2 ${pvcHubMode === 'setup' ? tabActive : tabIdle}`}
                  onClick={() => setPvcHubMode('setup')}
                >
                  <span className="text-sm font-semibold">Product setup</span>
                </button>
              </div>
            </section>
          ) : null}

          {pvcHubMode === 'setup' && isSupplierAccount ? (
            fmsRecipeLoading ? (
              <div className="flex min-h-[20vh] items-center justify-center text-slate-500">Loading product setup…</div>
            ) : (
              <FmsCalculatorRecipeEditor
                recipe={fmsRecipe}
                canEdit={canEditFmsRecipe}
                onChange={setFmsRecipe}
                onSave={saveFmsRecipe}
              />
            )
          ) : (
        <>
          <TuningSection defaultOpen={tuningDefaultOpen}>
            {renderFenceRunsSection({
              embedded: true,
              rows: lines,
              getSubtitle: (row, idx) => {
                const pvcRow = lines[idx];
                return formatPvcPanelSummary(pvcRow.panel_module, effectivePvcPanelSpacingFt);
              },
              getRunEnds: (row) => effectiveRunEnds(lines.find((l) => l.id === row.id)!),
              onLengthChange: (id, length_ft) => updateLine(id, { length_ft }),
              onRunEndChange: updateLineRunEnd,
              onApplyPreset: applyRunEndPreset,
              onRemove: removeLine,
              footer: (
                <button type="button" onClick={addLine} className={btnGhost}>
                  + Add run
                </button>
              ),
            })}
            {renderUnifiedPvcGatesSection({ embedded: true })}
          </TuningSection>

          <CollapsibleCard title="Extra items" subtitle="Only if you need more than the calculated list.">
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {MASTER_EXTRA_GROUPS.map((g) => {
                  const boardStiffHint =
                    g.mode === 'board_stiffener_ratio' && masterExtras.m8
                      ? boardStiffenersForBoardCount(
                          Number(String(masterExtras.m8).replace(/,/g, '')) || 0,
                          fmsRecipe.packs.board_per_pack,
                          fmsRecipe.packs.board_stiffeners_per_pack
                        )
                      : 0;
                  return (
                    <div key={g.keys.join('-')}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                        {g.label}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={groupedExtraDisplayValue(g, masterExtras)}
                        onChange={(e) =>
                          setMasterExtras((p) =>
                            applyGroupedExtraChange(
                              g,
                              e.target.value,
                              p,
                              fmsRecipe.packs.board_per_pack,
                              fmsRecipe.packs.board_stiffeners_per_pack
                            )
                          )
                        }
                        className={`${field} w-full`}
                        placeholder="0"
                      />
                      {boardStiffHint > 0 ? (
                        <p className="mt-1 text-[11px] text-slate-500">+{boardStiffHint} stiffeners</p>
                      ) : null}
                    </div>
                  );
                })}
                {MASTER_EXTRA_SOLO.map((s) => (
                  <div key={s.key}>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">{s.label}</label>
                    <input
                      type="text"
                      inputMode={s.integerOnly ? 'numeric' : 'decimal'}
                      value={masterExtras[s.key] ?? ''}
                      onChange={(e) => {
                        const v = sanitizeExtraInput(e.target.value, Boolean(s.integerOnly));
                        setMasterExtras((p) => {
                          const next = { ...p };
                          if (v === '') delete next[s.key];
                          else next[s.key] = v;
                          return next;
                        });
                      }}
                      className={`${field} w-full`}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <details className="rounded-lg border border-slate-100 bg-slate-50/40 p-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">Waste allowance (%)</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Boards</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={extraBoardsPct}
                      onChange={(e) => setExtraBoardsPct(sanitizeExtraInput(e.target.value, false))}
                      className={`${field} w-full`}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Large screws</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={extraLargeScrewPct}
                      onChange={(e) => setExtraLargeScrewPct(sanitizeExtraInput(e.target.value, false))}
                      className={`${field} w-full`}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Small screws</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={extraShortScrewPct}
                      onChange={(e) => setExtraShortScrewPct(sanitizeExtraInput(e.target.value, false))}
                      className={`${field} w-full`}
                      placeholder="0"
                    />
                  </div>
                </div>
              </details>
            </div>
          </CollapsibleCard>

          <div className={stageLabel}>
            <span>3 · Your list</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={h2}>Your order list</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {pvcBreakdownColour} · Uncheck anything the customer already has.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                      <th className="w-10 px-1 py-2" />
                      <th className="px-2 py-2">Item</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pvcMaster.map((r, idx) => {
                      if (r.header) {
                        return (
                          <tr key={`${idx}-${r.label}`} className="border-b border-slate-200 bg-slate-100">
                            <td colSpan={3} className="px-2 py-1.5 text-[11px] font-bold uppercase text-slate-600">
                              {r.label}
                            </td>
                          </tr>
                        );
                      }
                      const label = r.label?.trim() ?? '';
                      const canToggle = label.length > 0 && label !== 'Total Linear Ft' && label !== 'Total Gates';
                      const included = !canToggle || isMaterialIncluded(materialExclusions, 'pvc', label);
                      return (
                        <tr
                          key={`${idx}-${r.label || 'row'}`}
                          className={`border-b border-slate-100 ${!included ? 'bg-slate-50/80 opacity-55' : ''}`}
                        >
                          <td className="w-10 px-1 py-1.5">
                            {canToggle ? (
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={(e) => toggleMaterialInclude('pvc', label, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            ) : null}
                          </td>
                          <td
                            className={`px-2 py-1.5 font-medium ${included ? 'text-slate-800' : 'text-slate-500 line-through'}`}
                          >
                            {r.label || '\u00a0'}
                          </td>
                          <td
                            className={`px-2 py-1.5 text-right tabular-nums ${included ? 'text-slate-900' : 'text-slate-400 line-through'}`}
                          >
                            {r.qty}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50/40">
                <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold text-slate-500 [&::-webkit-details-marker]:hidden">
                  Pack breakdown &amp; detail rows
                </summary>
                <div className="overflow-x-auto border-t border-slate-100 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Total</th>
                        <th className="px-2 py-2 text-right">Packs</th>
                        <th className="px-2 py-2 text-right">Extras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pvcMaster.map((r, idx) => {
                        if (r.header) return null;
                        const label = r.label?.trim() ?? '';
                        if (!label) return null;
                        return (
                          <tr key={`pack-${idx}-${label}`} className="border-b border-slate-100">
                            <td className="px-2 py-1.5 text-slate-800">{label}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{r.qty}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatPacksCell(r.packs ?? 0) || '—'}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatLooseExtra(r.loose ?? 0) || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={copyBom} className={btn}>
                Copy list
              </button>
              <button type="button" className={btnGhost} onClick={() => void downloadMasterMaterialListPdf()}>
                Download PDF
              </button>
              <button type="button" className={btnGhost} onClick={resetMaterialCalculator}>
                Start over
              </button>
            </div>
          </section>
        </>
          )}
        </>
      )}

      {tab === 'chain' && (
        <>
          <CollapsibleCard title="Stock sizes" subtitle="Rail and mesh roll lengths — change only if your supplier uses different stock.">
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Rail length (ft)</label>
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
                <label className="mb-1 block text-xs font-semibold text-slate-500">Mesh roll (ft)</label>
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
          </CollapsibleCard>

          <TuningSection defaultOpen={tuningDefaultOpen}>
            {renderFenceRunsSection({
              embedded: true,
              rows: chainLines,
              getSubtitle: (_row, idx) =>
                chainRunInfoText(chainLines[idx]?.length_ft ?? '') || 'Chain link run',
              getRunEnds: (row) => effectiveChainRunEnds(chainLines.find((l) => l.id === row.id)!),
              onLengthChange: (id, length_ft) => updateChainLine(id, { length_ft }),
              onRunEndChange: updateChainLineRunEnd,
              onApplyPreset: applyChainRunEndPreset,
              onRemove: removeChainLine,
              showUChannel: false,
              footer: (
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setChainLines((rows) => [
                      ...rows,
                      {
                        id: newLineId(),
                        label: `Run ${rows.length + 1}`,
                        length_ft: '',
                        terminal_post: '2',
                        run_ends: {
                          start: { h_post: true, u_channel: false },
                          end: { h_post: true, u_channel: false },
                        },
                      },
                    ])
                  }
                >
                  + Add run
                </button>
              ),
            })}
            <div ref={chainGatesSectionRef}>{renderChainGatesEmbedded()}</div>
          </TuningSection>

          <StyleExtrasCard
            items={CHAIN_EXTRA_ITEMS}
            values={chainExtras}
            onChange={(key, v) =>
              setChainExtras((p) => {
                const next = { ...p };
                if (v === '') delete next[key];
                else next[key] = v;
                return next;
              })
            }
          />

          <div className={stageLabel}>
            <span>3 · Your list</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Your order list</h2>
              <p className="mt-1 text-xs text-slate-500">Uncheck anything the customer already has.</p>
            </div>
            <div className="overflow-x-auto p-5">
              {!chainFenceAgg || !chainMasterRows ? (
                <p className="text-sm text-slate-500">Enter at least one fence run length.</p>
              ) : (
                <table className="w-full max-w-xl text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <th className="w-10 py-1 pl-1">Inc.</th>
                      <th className="py-1">Item</th>
                      <th className="py-1 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const { large, small } = splitWare(chainMasterRows, (r) => r.label);
                      const itemRow = (r: { key: string; label: string; qty: number }, totals = false) => {
                        const included =
                          totals || isMaterialIncluded(materialExclusions, 'chain', r.label);
                        return (
                          <tr
                            key={r.key}
                            className={`border-b border-slate-100 ${!included ? 'bg-slate-50/80 opacity-55' : ''}`}
                          >
                            <td className="w-10 py-1.5 pl-1">
                              {!totals ? (
                                <input
                                  type="checkbox"
                                  checked={included}
                                  onChange={(e) => toggleMaterialInclude('chain', r.label, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                              ) : null}
                            </td>
                            <td
                              className={`py-1.5 font-medium ${included ? 'text-slate-800' : 'text-slate-500 line-through'}`}
                            >
                              {r.label}
                            </td>
                            <td
                              className={`py-1.5 text-right tabular-nums ${included ? '' : 'text-slate-400 line-through'}`}
                            >
                              {r.qty}
                            </td>
                          </tr>
                        );
                      };
                      return (
                        <>
                          {itemRow({ key: '_posts', label: 'Posts (all runs)', qty: chainFenceAgg.posts })}
                          <WareHeaderTr title={LARGE_WARE_TITLE} />
                          {large.map((r) => itemRow(r))}
                          <WareHeaderTr title={SMALL_WARE_TITLE} />
                          {small.map((r) => itemRow(r))}
                          {itemRow(
                            { key: '_lin_ft', label: 'Total linear ft', qty: chainFenceAgg.total_linear_ft },
                            true
                          )}
                          {itemRow({ key: '_gates', label: 'Total gates', qty: chainGateResults.length }, true)}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            {chainMasterRows ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    skipPostsForTab('chain', [
                      'Posts (all runs)',
                      ...chainMasterRows.map((r) => r.label),
                    ])
                  }
                >
                  Skip posts
                </button>
                <button type="button" className={btnGhost} onClick={() => void downloadChainMasterListPdf()}>
                  Download PDF
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}

      {tab === 'hybrid_h' && (
        <>
          <TuningSection defaultOpen={tuningDefaultOpen}>
            {renderFenceRunsSection({
              embedded: true,
              rows: hybHLines,
              getSubtitle: () => `${hybHHeight}' tall · 6' post spacing`,
              getRunEnds: (row) => effectiveHybridRunEnds(hybHLines.find((l) => l.id === row.id)!),
              onLengthChange: (id, length_ft) => updateHybHLine(id, { length_ft }),
              onRunEndChange: (id, which, field, checked) =>
                updateHybridLineRunEnd('h', id, which, field, checked),
              onApplyPreset: (id, preset) => applyHybridRunEndPreset('h', id, preset),
              onRemove: removeHybHLine,
              footer: (
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setHybHLines((rows) => [
                      ...rows,
                      {
                        id: newLineId(),
                        label: `Run ${rows.length + 1}`,
                        length_ft: '',
                        h_post: rows.length ? 1 : 2,
                        u_channel: 0,
                        run_ends: {
                          start: { h_post: rows.length > 0, u_channel: false },
                          end: { h_post: true, u_channel: false },
                        },
                      },
                    ])
                  }
                >
                  + Add run
                </button>
              ),
            })}
            {renderUnifiedHybridHGateSection({ embedded: true })}
          </TuningSection>

          <StyleExtrasCard
            items={HYBRID_H_EXTRA_ITEMS}
            values={hybHExtras}
            onChange={(key, v) =>
              setHybHExtras((p) => {
                const next = { ...p };
                if (v === '') delete next[key];
                else next[key] = v;
                return next;
              })
            }
          />

          <div className={stageLabel}>
            <span>3 · Your list</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Your order list</h2>
              <p className="mt-1 text-xs text-slate-500">
                {fmsHybridHoBoardMaterialLabel(hybHBoardMaterial)} · {hybHHeight}&apos; tall
                {hybridHHasColour ? ` · ${hybridColour}` : ''}. Uncheck anything the customer already has.
              </p>
            </div>
            <div className="p-5">
              {!hybridHJob.hasAny ? (
                <p className="text-sm text-slate-500">Enter at least one fence run length or gate width.</p>
              ) : (
                <HybridItemTable
                  rows={hybridHJob.master}
                  groupWare
                  tab="hybrid_h"
                  materialExclusions={materialExclusions}
                  onToggleInclude={(label, included) => toggleMaterialInclude('hybrid_h', label, included)}
                />
              )}
            </div>
            {hybridHJob.hasAny ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    skipPostsForTab(
                      'hybrid_h',
                      hybridHJob.master.map((r) => r.item)
                    )
                  }
                >
                  Skip posts
                </button>
                <button type="button" className={btnGhost} onClick={() => void downloadHybridMasterListPdf('h')}>
                  Download PDF
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}

      {tab === 'hybrid_v' && (
        <>
          <TuningSection defaultOpen={tuningDefaultOpen}>
            {renderFenceRunsSection({
              embedded: true,
              rows: hybVLines,
              getSubtitle: () => `${hybVMaterial.toUpperCase()} · 8' post spacing`,
              getRunEnds: (row) => effectiveHybridRunEnds(hybVLines.find((l) => l.id === row.id)!),
              onLengthChange: (id, length_ft) => updateHybVLine(id, { length_ft }),
              onRunEndChange: (id, which, field, checked) =>
                updateHybridLineRunEnd('v', id, which, field, checked),
              onApplyPreset: (id, preset) => applyHybridRunEndPreset('v', id, preset),
              onRemove: removeHybVLine,
              footer: (
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setHybVLines((rows) => [
                      ...rows,
                      {
                        id: newLineId(),
                        label: `Run ${rows.length + 1}`,
                        length_ft: '',
                        h_post: rows.length ? 1 : 2,
                        u_channel: 0,
                        run_ends: {
                          start: { h_post: rows.length > 0, u_channel: false },
                          end: { h_post: true, u_channel: false },
                        },
                      },
                    ])
                  }
                >
                  + Add run
                </button>
              ),
            })}
            {renderUnifiedHybridVGateSection({ embedded: true })}
          </TuningSection>

          <StyleExtrasCard
            items={HYBRID_V_EXTRA_ITEMS}
            values={hybVExtras}
            onChange={(key, v) =>
              setHybVExtras((p) => {
                const next = { ...p };
                if (v === '') delete next[key];
                else next[key] = v;
                return next;
              })
            }
          />

          <div className={stageLabel}>
            <span>3 · Your list</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Your order list</h2>
              <p className="mt-1 text-xs text-slate-500">
                {hybVMaterial.toUpperCase()} · {hybridColour}. Uncheck anything the customer already has.
              </p>
            </div>
            <div className="p-5">
              {!hybridVJob.hasAny ? (
                <p className="text-sm text-slate-500">Enter at least one fence run length or gate width.</p>
              ) : (
                <HybridItemTable
                  rows={hybridVJob.master}
                  groupWare
                  tab="hybrid_v"
                  materialExclusions={materialExclusions}
                  onToggleInclude={(label, included) => toggleMaterialInclude('hybrid_v', label, included)}
                />
              )}
            </div>
            {hybridVJob.hasAny ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    skipPostsForTab(
                      'hybrid_v',
                      hybridVJob.master.map((r) => r.item)
                    )
                  }
                >
                  Skip posts
                </button>
                <button type="button" className={btnGhost} onClick={() => void downloadHybridMasterListPdf('v')}>
                  Download PDF
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}

      <div className="border-t border-slate-200 pt-8">
        <button type="button" className={btnReset} onClick={resetMaterialCalculator}>
          Start over
        </button>
      </div>
      </>
      ) : null}

      {showSupplierMaterialRequest ? (
        <SupplierMaterialQuoteActions
          requestId={materialRequestId}
          onDownloadMasterPdf={() => void downloadActiveTabMaterialListPdf()}
          buildMasterPdfBlob={activeTabMaterialListPdfAvailable ? buildActiveTabMaterialListPdfBlob : undefined}
          masterPdfAvailable={activeTabMaterialListPdfAvailable}
          buildMaterialRowsForQuote={buildSupplierMaterialQuoteLines}
          quoteExportMeta={quoteExportMeta}
          quoteDetailHref={`/dashboard/supplier/contractor-quotes/${encodeURIComponent(materialRequestId)}`}
          calculatorBlocked={Boolean(fmsQuoteMaterialUnsupported)}
        />
      ) : null}
      </div>
    </div>
  );
}
