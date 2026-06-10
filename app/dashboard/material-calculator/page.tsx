'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { inferFmsHubMaterialFromQuoteProject } from '@/lib/material-quote-fms-calculator-style';
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
  FMS_PVC_PANEL_HEIGHT_LABELS,
  defaultFmsPvcPanelSpacingFt,
  type FmsPvcFenceLineInput,
  type FmsPvcPanelModule,
} from '@/lib/fms-pvc-material-calculator';
import {
  adobeBreakdownToRows,
  buildPvcAdobeBreakdown,
  computePvcMasterColumn,
  pvcBoardsPercentAdd,
  type FmsPvcMasterExtras,
} from '@/lib/fms-pvc-breakdown-master';
import { LARGE_WARE_TITLE, SMALL_WARE_TITLE, splitWare } from '@/lib/material-ware';
import { formatLooseExtra, formatPacksCell } from '@/lib/pvc-material-packs';
import { sumGateAdobeRows, type FmsPvcGatePosts } from '@/lib/fms-pvc-gates-calculator';
import {
  aggregateFmsChainLinkFenceLines,
  computeFmsChainLinkFenceLine,
  computeFmsChainLinkGate,
  type FmsChainLinkFenceInput,
} from '@/lib/fms-chain-link-calculator';
import {
  FMS_HYBRID_HO_FAMILIES,
  FMS_HYBRID_VE_BLOCK_TITLE,
  buildFmsHybridMasterList,
  computeHybridHorizontalAdjacentGate,
  computeHybridHorizontalDoubleGate,
  computeHybridHorizontalFence,
  computeHybridHorizontalGate,
  computeHybridVerticalGateDouble,
  computeHybridVerticalGateSingle,
  computeHybridVerticalPvc64Fence,
  fmsHybridHoBlockTitle,
  sumFmsHybridRows,
  type FmsHybridHoFamily,
  type FmsHybridHoHeight,
  type FmsHybridItemRow,
} from '@/lib/fms-hybrid-calculators';
import {
  FMS_PVC_CALCULATOR_COLOURS,
  FMS_WPC_CALCULATOR_COLOURS,
  coerceFmsPvcCalculatorColour,
  coerceFmsWpcCalculatorColour,
  fmsPvcMaterialListBreakdownTitle,
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
  adjustLayoutDrawingSegmentLength,
  alignChainedSketchSegments,
  grossLengthFtForSketchSegment,
  layoutPointsToSegmentPairs,
  layoutSegmentsToPvcFenceInputsPerSketchSegment,
  netFenceLengthFtForSegment,
  removeLayoutDrawingGatePlacement,
  removeLayoutDrawingSegment,
  sketchGateWidthInches,
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
          <th className="py-1 text-right font-bold">Final</th>
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
  /** When true, lengths / D6 came from the layout sketch (same corner logic as PVC). */
  fromSketch?: boolean;
};

/** One Excel fence-line block on the hybrid horizontal / vertical calculator tabs. */
type HybridLineRow = {
  id: string;
  label: string;
  length_ft: string;
  h_post: 0 | 1 | 2;
  u_channel: 0 | 1 | 2;
  /** When true, length / D6 / D7 came from the layout sketch (vertical tab only). */
  fromSketch?: boolean;
};

type HybridHGateKind = 'simple' | 'adjacent' | 'double';

type HybridHGateRow = {
  id: string;
  kind: HybridHGateKind;
  width_in: string;
  /** Simple gate "Post needed, 0, 1 or 2". */
  posts: 0 | 1 | 2;
  /** Adjacent: 0=adjoining yes, 1=no, 2=gate in middle. Double: 0=yes, 1=no. */
  adjoining: 0 | 1 | 2;
  sketchPlacementIndex?: number;
};

type HybridVGateRow = {
  id: string;
  kind: 'single' | 'double';
  width_in: string;
  posts: 0 | 1 | 2;
  sketchPlacementIndex?: number;
};

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
  });
  return inputs.map((inp, i) => ({
    id: newLineId(),
    label: `Run ${i + 1}`,
    length_ft: String(netPerSeg[i] ?? 0),
    panel_module: panelModule,
    end_preset: 'custom',
    h_post_type: inp.fence_terminated_h_post_type as 0 | 1 | 2,
    u_channel: String(inp.fence_terminated_u_channel),
    fromSketch: true,
  }));
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
  });
  return inputs.map((inp, i) => ({
    id: newLineId(),
    label: `Run ${i + 1}`,
    length_ft: String(netPerSeg[i] ?? 0),
    terminal_post: String(inp.fence_terminated_h_post_type),
    fromSketch: true,
  }));
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
  });
  return inputs.map((inp, i) => ({
    id: newLineId(),
    label: `Run ${i + 1}`,
    length_ft: String(netPerSeg[i] ?? 0),
    h_post: inp.fence_terminated_h_post_type as 0 | 1 | 2,
    u_channel: Math.max(0, Math.min(2, Math.round(Number(inp.fence_terminated_u_channel) || 0))) as 0 | 1 | 2,
    fromSketch: true,
  }));
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

function buildInputs(rows: PvcLineRow[], panelSpacingFt: number): FmsPvcFenceLineInput[] {
  const spacing = Number.isFinite(panelSpacingFt) && panelSpacingFt > 0 ? panelSpacingFt : undefined;
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
        ...(spacing ? { panel_spacing_ft: spacing } : {}),
      };
    })
    .filter(Boolean) as FmsPvcFenceLineInput[];
}

function emptyGateRow(): PvcGateRow {
  return { id: newLineId(), width_in: '', posts: 1 };
}

/**
 * Map a sketch gate (on a fence segment) to the correct PVC gate calculator row.
 * Width (in) comes from that segment’s length in feet × 12; short path if &lt; 59.5″, else single uses min 65.5″,
 * double uses min 106″ when the user placed a double gate on the sketch.
 */
/** Calculator rows show net fence length; sketch stores gross segment length including gate openings. */
function grossLengthFtForSketchEdit(
  segmentIndex: number,
  netLengthFt: number,
  sketch: LayoutSketchDrawingPayload
): number {
  const placements = sketch.gate_placements;
  const segments = sketch.segments;
  if (!placements?.length || !segments?.length) return netLengthFt;
  let gateFt = 0;
  for (const g of placements) {
    if (g.line_index === segmentIndex) {
      gateFt += sketchGateWidthInches(g, segments) / 12;
    }
  }
  return Math.round((netLengthFt + gateFt) * 100) / 100;
}

function pvcGateFromSketchPlacement(
  placement: SketchGatePlacement,
  segments: { length_ft: number }[]
): { kind: 'short' | 'single' | 'double'; row: PvcGateRow } {
  const widthRaw = sketchGateWidthInches(placement, segments);
  const wStr = (n: number) => String(Math.round(n * 100) / 100);

  if (widthRaw > 0 && widthRaw < 59.5) {
    return { kind: 'short', row: { id: newLineId(), width_in: wStr(widthRaw), posts: 1 } };
  }
  if (placement.type === 'double') {
    return { kind: 'double', row: { id: newLineId(), width_in: wStr(widthRaw), posts: 1 } };
  }
  return { kind: 'single', row: { id: newLineId(), width_in: wStr(widthRaw), posts: 1 } };
}

function chainGateRowFromSketchPlacement(
  placement: { type: 'single' | 'double'; line_index: number },
  segments: { length_ft: number }[]
): { id: string; width_in: string; posts: FmsPvcGatePosts; opening_in: string } {
  const { row } = pvcGateFromSketchPlacement(placement, segments);
  return { id: newLineId(), width_in: row.width_in, posts: row.posts, opening_in: '45' };
}

function hybVGateRowFromSketchPlacement(
  placement: { type: 'single' | 'double'; line_index: number },
  segments: { length_ft: number }[]
): HybridVGateRow {
  const { row } = pvcGateFromSketchPlacement(placement, segments);
  return { id: newLineId(), kind: placement.type, width_in: row.width_in, posts: 1 };
}

function hybHGateRowFromSketchPlacement(
  placement: { type: 'single' | 'double'; line_index: number },
  segments: { length_ft: number }[]
): HybridHGateRow {
  const { row } = pvcGateFromSketchPlacement(placement, segments);
  return {
    id: newLineId(),
    kind: placement.type === 'double' ? 'double' : 'simple',
    width_in: row.width_in,
    posts: 1,
    adjoining: 1,
  };
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

/** Board extra stiffeners: 3 stiffeners for every 16 boards (round up). */
const BOARD_EXTRA_STIFFENERS_PER = 3;
const BOARD_EXTRA_BOARDS_PER = 16;

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

function boardExtraStiffenerCount(boards: number): number {
  if (!Number.isFinite(boards) || boards <= 0) return 0;
  return Math.ceil((boards * BOARD_EXTRA_STIFFENERS_PER) / BOARD_EXTRA_BOARDS_PER);
}

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
  prev: Partial<Record<keyof FmsPvcMasterExtras, string>>
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
      next[group.stiffKey] = String(boardExtraStiffenerCount(boards));
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

function coerceHybridHoFamily(x: unknown): FmsHybridHoFamily {
  return x === 'woodGrain' || x === 'slatted' || x === 'aluminum' ? x : 'woodGrain';
}

function coerceHybridHoHeight(x: unknown): FmsHybridHoHeight {
  return Number(x) === 7 ? 7 : 6;
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
      return {
        type: type as 'single' | 'double',
        line_index,
        ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
        ...(Number.isFinite(width_in) && width_in > 0 ? { width_in } : {}),
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
      const expectedAligned = al.length + 1;
      const expectedRaw = segments.length + 1;
      const lenOk =
        jtRaw.length === expectedAligned ||
        (jtRaw.length === expectedRaw && al.length === segments.length);
      if (lenOk) {
        joint_terminations = jtRaw.slice(0, expectedAligned).map((row) => {
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
    const posts = Number(o.posts);
    const p: FmsPvcGatePosts = posts === 0 || posts === 1 || posts === 2 ? posts : 1;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: p,
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
    const posts = Number(o.posts);
    const p: FmsPvcGatePosts = posts === 0 || posts === 1 || posts === 2 ? posts : 1;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: p,
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
    });
  }
  return out.length ? out : null;
}

function parseHybridHGates(raw: unknown): HybridHGateRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HybridHGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const kind: HybridHGateKind = o.kind === 'adjacent' || o.kind === 'double' ? o.kind : 'simple';
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      kind,
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: coerceH012(o.posts),
      adjoining: coerceH012(o.adjoining ?? 0),
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    });
  }
  return out;
}

function parseHybridVGates(raw: unknown): HybridVGateRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HybridVGateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : newLineId(),
      kind: o.kind === 'double' ? 'double' : 'single',
      width_in: typeof o.width_in === 'string' || typeof o.width_in === 'number' ? String(o.width_in) : '',
      posts: coerceH012(o.posts),
      sketchPlacementIndex: parseSketchPlacementIndex(o),
    });
  }
  return out;
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

  const [layoutSketchData, setLayoutSketchData] = useState<LayoutSketchDrawingPayload | null>(null);
  const layoutSketchDataRef = useRef<LayoutSketchDrawingPayload | null>(null);
  layoutSketchDataRef.current = layoutSketchData;
  const [layoutCanvasRemountKey, setLayoutCanvasRemountKey] = useState(0);

  const [shortGates, setShortGates] = useState<PvcGateRow[]>([]);
  const [singleGates, setSingleGates] = useState<PvcGateRow[]>([]);
  const [doubleGates, setDoubleGates] = useState<PvcGateRow[]>([]);
  /** How many sketch `gate_placements` we have already mirrored into PVC gate rows (append-only). */
  const sketchSyncedGatePlacementCountRef = useRef(0);
  const pvcGatesSectionRef = useRef<HTMLElement | null>(null);
  const chainGatesSectionRef = useRef<HTMLElement | null>(null);
  const [masterExtrasOpen, setMasterExtrasOpen] = useState(false);
  const [masterExtras, setMasterExtras] = useState<Partial<Record<keyof FmsPvcMasterExtras, string>>>({});
  /** Per-tab material labels excluded from order PDF / supplier quotes (customer already has them). */
  const [materialExclusions, setMaterialExclusions] = useState<MaterialExclusions>({});
  /** Percentage uplift applied to the final board count (e.g. "5" → +5% boards, rounded up). */
  const [extraBoardsPct, setExtraBoardsPct] = useState('');
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

  const applyPvcPanelModule = useCallback((module: FmsPvcPanelModule) => {
    setPvcPanelModule(module);
    setPvcPanelSpacingFt(String(defaultFmsPvcPanelSpacingFt(module)));
    sketchToLinesSyncKeyRef.current = '';
    setLines((prev) => prev.map((l) => ({ ...l, panel_module: module })));
  }, []);

  /** Hybrid horizontal (Excel `Horizontal Material Calculator `). */
  const [hybHFamily, setHybHFamily] = useState<FmsHybridHoFamily>('woodGrain');
  const [hybHHeight, setHybHHeight] = useState<FmsHybridHoHeight>(6);
  const [hybHLines, setHybHLines] = useState<HybridLineRow[]>(() => defaultHybridLines());
  const [hybHGates, setHybHGates] = useState<HybridHGateRow[]>([]);
  /** Hybrid vertical (Excel `Vertical Material Calculator - `). */
  const [hybVLines, setHybVLines] = useState<HybridLineRow[]>(() => defaultHybridLines());
  const [hybVGates, setHybVGates] = useState<HybridVGateRow[]>([]);
  const [hybridWpcColour, setHybridWpcColour] = useState<FmsWpcCalculatorColour>('Ash');
  const [hybridPvcColour, setHybridPvcColour] = useState<FmsPvcCalculatorColour>('White');

  /** Plan sketch from `?from_material_quote=` (loading / found / missing). */
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

  useEffect(() => {
    if (isStyleTabParam(tabParam)) {
      setTab(coerceStyleTab(tabParam));
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
    fetch('/api/contractor/me', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const id = data?.id;
        if (typeof id === 'string' && id) setContractorId(id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contractorId) return;
    const hydrateKey = `${contractorId}|${fromLayoutId ?? ''}|${fromMaterialQuoteId ?? ''}|${fromMaterialSketchSaveId ?? ''}|${materialRequestId}`;
    if (materialCalcHydrateKeyRef.current === hydrateKey) return;

    const hasUrlTab = isStyleTabParam(tabParam);
    const urlPvcCol = coerceFmsPvcCalculatorColour(searchParams.get('pvc_colour'));
    const urlHwCol = coerceFmsWpcCalculatorColour(searchParams.get('hybrid_wpc'));
    const urlHpCol = coerceFmsPvcCalculatorColour(searchParams.get('hybrid_pvc'));
    const skipPvcLinesAndSketch = Boolean(
      fromLayoutId || fromMaterialQuoteId || fromMaterialSketchSaveId || materialRequestId
    );

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
      if (typeof d.jobAddress === 'string') setJobAddress(d.jobAddress);

      if (!urlPvcCol) {
        const c = typeof d.pvcBreakdownColour === 'string' ? coerceFmsPvcCalculatorColour(d.pvcBreakdownColour) : null;
        if (c) setPvcBreakdownColour(c);
      }
      if (!urlHwCol) {
        const c = typeof d.hybridWpcColour === 'string' ? coerceFmsWpcCalculatorColour(d.hybridWpcColour) : null;
        if (c) setHybridWpcColour(c);
      }
      if (!urlHpCol) {
        const c = typeof d.hybridPvcColour === 'string' ? coerceFmsPvcCalculatorColour(d.hybridPvcColour) : null;
        if (c) setHybridPvcColour(c);
      }

      if (!skipPvcLinesAndSketch) {
        const pl = parsePvcLines(d.lines);
        if (pl) setLines(pl);
        const sketch = parseLayoutSketch(d.layoutSketchData);
        if (sketch) {
          setLayoutSketchData(sketch);
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

      if (d.hybHFamily !== undefined) setHybHFamily(coerceHybridHoFamily(d.hybHFamily));
      if (d.hybHHeight !== undefined) setHybHHeight(coerceHybridHoHeight(d.hybHHeight));
      const hhl = parseHybridLines(d.hybHLines);
      if (hhl) setHybHLines(hhl);
      const hhg = parseHybridHGates(d.hybHGates);
      if (hhg) setHybHGates(hhg);
      const hvl = parseHybridLines(d.hybVLines);
      if (hvl) setHybVLines(hvl);
      const hvg = parseHybridVGates(d.hybVGates);
      if (hvg) setHybVGates(hvg);
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
      chainExtras,
      hybHExtras,
      hybVExtras,
      chainLines,
      chainRailFt,
      chainMeshFt,
      chainTiesPerBag,
      chainGates,
      hybHFamily,
      hybHHeight,
      hybHLines,
      hybHGates,
      hybVLines,
      hybVGates,
      hybridWpcColour,
      hybridPvcColour,
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
    chainExtras,
    hybHExtras,
    hybVExtras,
    chainLines,
    chainRailFt,
    chainMeshFt,
    chainTiesPerBag,
    chainGates,
    hybHFamily,
    hybHHeight,
    hybHLines,
    hybHGates,
    hybVLines,
    hybVGates,
    hybridWpcColour,
    hybridPvcColour,
    materialExclusions,
  ]);

  const toggleMaterialInclude = useCallback((matTab: MaterialCalcTab, label: string, included: boolean) => {
    setMaterialExclusions((prev) => toggleMaterialExclusion(prev, matTab, label, included));
  }, []);

  const skipPostsForTab = useCallback((matTab: MaterialCalcTab, labels: string[]) => {
    const postLabels = postRelatedMaterialLabels(labels);
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
    chainExtras,
    hybHExtras,
    hybVExtras,
    chainLines,
    chainRailFt,
    chainMeshFt,
    chainTiesPerBag,
    chainGates,
    hybHFamily,
    hybHHeight,
    hybHLines,
    hybHGates,
    hybVLines,
    hybVGates,
    hybridWpcColour,
    hybridPvcColour,
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
    setChainExtras({});
    setHybHExtras({});
    setHybVExtras({});
    setChainLines(defaultChainLines());
    setChainRailFt('10');
    setChainMeshFt('50');
    setChainTiesPerBag('100');
    setChainGates([]);
    setHybHFamily('woodGrain');
    setHybHHeight(6);
    setHybHLines(defaultHybridLines());
    setHybHGates([]);
    setHybVLines(defaultHybridLines());
    setHybVGates([]);
    setHybridWpcColour('Ash');
    setHybridPvcColour('White');
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
        const addr = req.project?.home_address?.trim();
        if (addr) setJobAddress(addr);
        const sketch = layoutSketchFromMaterialQuoteProject(req.project);
        setShortGates([]);
        setSingleGates([]);
        setDoubleGates([]);
        setChainGates([]);
        setHybVGates([]);
        sketchSyncedGatePlacementCountRef.current = 0;
        sketchToLinesSyncKeyRef.current = '';
        if (sketch) {
          setLayoutSketchData(sketch);
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
          if (inferred.kind === 'pvc' && inferred.pvcColour) {
            setPvcBreakdownColour(inferred.pvcColour);
          }
          if (inferred.kind === 'hybrid') {
            if (inferred.wpcColour) setHybridWpcColour(inferred.wpcColour);
            if (inferred.pvcColour) setHybridPvcColour(inferred.pvcColour);
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
        setHybVGates([]);
        sketchSyncedGatePlacementCountRef.current = 0;
        sketchToLinesSyncKeyRef.current = '';
        if (sketch) {
          setLayoutSketchData(sketch);
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
    sketchHadSegmentsRef.current = true;
    const key = JSON.stringify({
      p: payload.points,
      s: payload.segments,
      g: payload.gate_placements,
    });
    if (key === sketchToLinesSyncKeyRef.current) return;
    sketchToLinesSyncKeyRef.current = key;

    const panelModule = pvcPanelModule;

    setLines((prev) => {
      const next = drawingDataToPvcLineRows(payload, panelModule);
      if (!next?.length) return prev;
      return next.map((row, i) => {
        const old = prev[i];
        if (old?.fromSketch) return { ...row, id: old.id, label: old.label };
        return row;
      });
    });
    setChainLines((prev) => {
      const next = drawingDataToChainLineRows(payload, panelModule);
      if (!next?.length) return prev;
      return next.map((row, i) => {
        const old = prev[i];
        if (old?.fromSketch) return { ...row, id: old.id, label: old.label };
        return row;
      });
    });
    setHybVLines((prev) => {
      const next = drawingDataToHybridVLineRows(payload, panelModule);
      if (!next?.length) return prev;
      return next.map((row, i) => {
        const old = prev[i];
        if (old?.fromSketch) return { ...row, id: old.id, label: old.label };
        return row;
      });
    });
    // Hybrid horizontal shares the same per-segment geometry (H post / U channel ends).
    setHybHLines((prev) => {
      const next = drawingDataToHybridVLineRows(payload, panelModule);
      if (!next?.length) return prev;
      return next.map((row, i) => {
        const old = prev[i];
        if (old?.fromSketch) return { ...row, id: old.id, label: old.label };
        return row;
      });
    });
  }, [layoutSketchData, pvcPanelModule]);

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
      setHybVGates((p) => [
        ...p,
        { ...hybVGateRowFromSketchPlacement(placement, segs), sketchPlacementIndex: placementIndex },
      ]);
      setHybHGates((p) => [
        ...p,
        { ...hybHGateRowFromSketchPlacement(placement, segs), sketchPlacementIndex: placementIndex },
      ]);
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
    () => buildInputs(lines, effectivePvcPanelSpacingFt),
    [lines, effectivePvcPanelSpacingFt]
  );
  const pvcJob = useMemo(() => aggregateFmsPvcFenceLines(pvcInputs), [pvcInputs]);
  const pvcFenceLinearFt = useMemo(
    () => pvcInputs.reduce((acc, row) => acc + (Number(row.length_ft) || 0), 0),
    [pvcInputs]
  );

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
        o.m9 = boardExtraStiffenerCount(boards);
      }
    }

    return o;
  }, [masterExtras]);

  const pvcAdobe = useMemo(
    () => buildPvcAdobeBreakdown(pvcJob.lines, gateMerge.merged, gateWidthInchesSum),
    [pvcJob.lines, gateMerge.merged, gateWidthInchesSum]
  );

  const extraBoardsPctNum = useMemo(() => {
    const n = Number(String(extraBoardsPct).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [extraBoardsPct]);

  /** Preview of how many boards the percentage uplift adds (base boards incl. manual extras). */
  const extraBoardsPctAdd = useMemo(() => {
    const base = (pvcAdobe[8] ?? 0) + (pvcAdobe[23] ?? 0) + (extrasParsed.m8 ?? 0);
    return pvcBoardsPercentAdd(base, extraBoardsPctNum);
  }, [pvcAdobe, extrasParsed, extraBoardsPctNum]);

  const pvcMaster = useMemo(
    () => computePvcMasterColumn(pvcAdobe, extrasParsed, gateCount, pvcFenceLinearFt, extraBoardsPctNum),
    [pvcAdobe, extrasParsed, gateCount, pvcFenceLinearFt, extraBoardsPctNum]
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
      .map((r) => `${r.row}\t${r.label}\t${r.qty}`);
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
      'Row\tItem\tQty',
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
    const { buildMasterMaterialListPdfRows } = await import('@/lib/master-material-list-pdf-data');
    const rows = buildMasterMaterialListPdfRows(
      pvcAdobe,
      extrasParsed,
      gateCount,
      pvcFenceLinearFt,
      extraBoardsPctNum
    ).filter((r) => {
      if (r.section === 'wareHeader' || r.section === 'spacer' || r.section === 'totals' || r.section === 'taxRow') {
        return true;
      }
      return isMaterialIncluded(materialExclusions, 'pvc', r.label);
    });
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
    extraBoardsPctNum,
    pvcPanelModule,
    pvcBreakdownColour,
    jobAddress,
    materialExclusions,
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

  /** Per-line sums for posts/caps/bands/ties; rails + mesh from total linear ft across the job. */
  const chainFenceAgg = useMemo(() => aggregateFmsChainLinkFenceLines(chainFenceInputs), [chainFenceInputs]);

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

  const downloadChainMasterListPdf = useCallback(async () => {
    if (!chainFenceRows || !chainFenceAgg) return;
    const ex = (k: string) => styleExtraValue(chainExtras, k);
    const fmt = (n: number) => {
      const r = Math.round(n * 100) / 100;
      return Number.isFinite(r) ? String(r) : '';
    };
    const itemRows = [
      ...chainFenceRows
        .filter((r) => isMaterialIncluded(materialExclusions, 'chain', r.label))
        .map((r) => ({ key: r.key, label: r.label, qty: r.qty })),
      ...(chainGateRows ?? [])
        .filter((r) => isMaterialIncluded(materialExclusions, 'chain', `Gate — ${r.label}`))
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
    const pdfRows: import('@/lib/master-material-list-pdf-data').MasterMaterialListPdfRow[] = [
      { label: LARGE_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
      ...large.map((r) => toPdfRow(r, 'structure')),
      { label: SMALL_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
      ...small.map((r) => toPdfRow(r, 'hardware')),
      { label: '', adobe: '', packs: '', extras: '', section: 'spacer' as const },
      { label: 'Total Linear Ft', adobe: fmt(chainFenceAgg.total_linear_ft), packs: '', extras: '', section: 'totals' as const },
      { label: 'Total Gates', adobe: fmt(chainGateResults.length), packs: '', extras: '', section: 'totals' as const },
      { label: 'Total B4 Tax', adobe: '', packs: '', extras: '', section: 'taxRow' as const },
    ];
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'chain-link-material-list'}.pdf`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [chainFenceRows, chainGateRows, chainFenceAgg, chainGateResults, chainExtras, jobAddress, materialExclusions]);

  /** Hybrid horizontal — one Excel block result per run, plus gate blocks and summed totals. */
  const hybridHJob = useMemo(() => {
    const runs = hybHLines.map((row) => {
      const L = Math.max(0, Number(String(row.length_ft).replace(/,/g, '')) || 0);
      if (L <= 0) return { row, result: null as null | ReturnType<typeof computeHybridHorizontalFence> };
      return {
        row,
        result: computeHybridHorizontalFence(
          { length_ft: L, h_post: row.h_post, u_channel: row.u_channel },
          hybHFamily,
          hybHHeight
        ),
      };
    });
    const gates = hybHGates.map((g) => {
      const w = Math.max(0, Number(String(g.width_in).replace(/,/g, '')) || 0);
      if (w <= 0) return { gate: g, rows: null as null | FmsHybridItemRow[] };
      if (g.kind === 'simple') {
        return { gate: g, rows: computeHybridHorizontalGate({ gate_width_in: w, posts: g.posts }, hybHFamily, hybHHeight).rows };
      }
      if (g.kind === 'adjacent') {
        return {
          gate: g,
          rows: computeHybridHorizontalAdjacentGate({ gate_line_width_in: w, adjoining: g.adjoining }).rows,
        };
      }
      return {
        gate: g,
        rows: computeHybridHorizontalDoubleGate({
          gate_line_width_in: w,
          adjoining: (g.adjoining === 2 ? 1 : g.adjoining) as 0 | 1,
        }).rows,
      };
    });
    const totals = sumFmsHybridRows([
      ...runs.filter((r) => r.result).map((r) => r.result!.rows),
      ...gates.filter((g) => g.rows).map((g) => g.rows!),
    ]);
    const master = applyHybridExtras(buildFmsHybridMasterList(totals, 'horizontal'), HYBRID_H_EXTRA_ITEMS, hybHExtras);
    const hasAny = runs.some((r) => r.result) || gates.some((g) => g.rows);
    return { runs, gates, totals, master, hasAny };
  }, [hybHLines, hybHGates, hybHFamily, hybHHeight, hybHExtras]);

  /** Hybrid vertical — same structure for the 6'4" PVC sheet. */
  const hybridVJob = useMemo(() => {
    const runs = hybVLines.map((row) => {
      const L = Math.max(0, Number(String(row.length_ft).replace(/,/g, '')) || 0);
      if (L <= 0) return { row, result: null as null | ReturnType<typeof computeHybridVerticalPvc64Fence> };
      return {
        row,
        result: computeHybridVerticalPvc64Fence({ length_ft: L, h_post: row.h_post, u_channel: row.u_channel }),
      };
    });
    const gates = hybVGates.map((g) => {
      const w = Math.max(0, Number(String(g.width_in).replace(/,/g, '')) || 0);
      if (w <= 0) return { gate: g, rows: null as null | FmsHybridItemRow[] };
      const rows =
        g.kind === 'single'
          ? computeHybridVerticalGateSingle({ gate_width_in: w, posts: g.posts }).rows
          : computeHybridVerticalGateDouble({ gate_width_in: w, posts: g.posts }).rows;
      return { gate: g, rows };
    });
    const totals = sumFmsHybridRows([
      ...runs.filter((r) => r.result).map((r) => r.result!.rows),
      ...gates.filter((g) => g.rows).map((g) => g.rows!),
    ]);
    const master = applyHybridExtras(buildFmsHybridMasterList(totals, 'vertical'), HYBRID_V_EXTRA_ITEMS, hybVExtras);
    const hasAny = runs.some((r) => r.result) || gates.some((g) => g.rows);
    return { runs, gates, totals, master, hasAny };
  }, [hybVLines, hybVGates, hybVExtras]);

  const downloadHybridMasterListPdf = useCallback(
    async (which: 'h' | 'v') => {
      const job = which === 'h' ? hybridHJob : hybridVJob;
      if (!job.hasAny) return;
      const defs = which === 'h' ? HYBRID_H_EXTRA_ITEMS : HYBRID_V_EXTRA_ITEMS;
      const values = which === 'h' ? hybHExtras : hybVExtras;
      const lines = which === 'h' ? hybHLines : hybVLines;
      const colour = which === 'h' ? hybridWpcColour : hybridPvcColour;
      const subtitle = which === 'h' ? fmsHybridHoBlockTitle(hybHFamily, hybHHeight) : FMS_HYBRID_VE_BLOCK_TITLE;

      // Extras column: how much of each master row came from the extra-item inputs.
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
      const includedMaster = job.master.filter((r) =>
        isMaterialIncluded(materialExclusions, matTab, r.item)
      );
      const { large, small } = splitWare(includedMaster, (r) => r.item);
      const toPdfRow = (r: FmsHybridItemRow, section: 'structure' | 'hardware') => ({
        label: r.item,
        adobe: fmt(r.final),
        packs: '',
        extras: extrasByItem.get(r.item.toLowerCase()) ? fmt(extrasByItem.get(r.item.toLowerCase())!) : '',
        section,
      });
      const pdfRows: import('@/lib/master-material-list-pdf-data').MasterMaterialListPdfRow[] = [
        { label: LARGE_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
        ...large.map((r) => toPdfRow(r, 'structure')),
        { label: SMALL_WARE_TITLE, adobe: '', packs: '', extras: '', section: 'wareHeader' as const },
        ...small.map((r) => toPdfRow(r, 'hardware')),
        { label: '', adobe: '', packs: '', extras: '', section: 'spacer' as const },
        { label: 'Total Linear Ft', adobe: fmt(linearFt), packs: '', extras: '', section: 'totals' as const },
        { label: 'Total Gates', adobe: fmt(gateCount), packs: '', extras: '', section: 'totals' as const },
        { label: 'Total B4 Tax', adobe: '', packs: '', extras: '', section: 'taxRow' as const },
      ];

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'hybrid-material-list'}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [
      hybridHJob,
      hybridVJob,
      hybHExtras,
      hybVExtras,
      hybHLines,
      hybVLines,
      hybridWpcColour,
      hybridPvcColour,
      hybHFamily,
      hybHHeight,
      jobAddress,
      materialExclusions,
    ]
  );

  const buildSupplierMaterialQuoteLines = useCallback((): MaterialQuoteLine[] => {
    const rows: MaterialQuoteLine[] = [];
    const add = (description: string, qty: unknown) => {
      const q = typeof qty === 'number' ? qty : Number(qty);
      if (!description.trim() || !Number.isFinite(q) || q === 0) return;
      rows.push({ description: description.trim(), qty: q });
    };

    if (tab === 'pvc') {
      for (const r of pvcJob.sku_rows) {
        if (isMaterialIncluded(materialExclusions, 'pvc', r.label)) {
          add(`PVC fence — ${r.label}`, r.quantity);
        }
      }
      for (const r of adobeRows) {
        if (isMaterialIncluded(materialExclusions, 'pvc', r.label)) {
          add(`${pvcBreakdownColour} (breakdown) — ${r.label}`, r.qty);
        }
      }
      for (const r of pvcMaster) {
        if (r.label?.trim() && !r.header && isMaterialIncluded(materialExclusions, 'pvc', r.label)) {
          add(`Master — ${r.label}`, r.qty);
        }
      }
      return rows;
    }

    if (tab === 'chain') {
      if (chainFenceRows) {
        chainFenceRows.forEach((r) => {
          if (isMaterialIncluded(materialExclusions, 'chain', r.label)) {
            add(`Chain link — ${r.label}`, r.qty);
          }
        });
      }
      if (chainGateRows) {
        chainGateRows.forEach((r) => {
          const label = `Gate — ${r.label}`;
          if (isMaterialIncluded(materialExclusions, 'chain', label)) {
            add(`Chain gate — ${r.label}`, r.qty);
          }
        });
      }
      return rows;
    }

    if (tab === 'hybrid_h' && hybridHJob.hasAny) {
      for (const r of hybridHJob.master) {
        if (isMaterialIncluded(materialExclusions, 'hybrid_h', r.item)) {
          add(`Hybrid horizontal — ${r.item}`, r.final);
        }
      }
    }

    if (tab === 'hybrid_v' && hybridVJob.hasAny) {
      for (const r of hybridVJob.master) {
        if (isMaterialIncluded(materialExclusions, 'hybrid_v', r.item)) {
          add(`Hybrid vertical — ${r.item}`, r.final);
        }
      }
    }

    return rows;
  }, [
    tab,
    pvcJob,
    adobeRows,
    pvcMaster,
    pvcBreakdownColour,
    chainFenceRows,
    chainGateRows,
    hybridHJob,
    hybridVJob,
    materialExclusions,
  ]);

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

  function updateLine(id: string, patch: Partial<PvcLineRow>) {
    setLines((rows) => {
      const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const idx = next.findIndex((r) => r.id === id);
      const merged = idx >= 0 ? next[idx] : null;
      const sketch = layoutSketchDataRef.current;
      if (
        merged?.fromSketch &&
        sketch?.segments?.length &&
        idx >= 0 &&
        idx < sketch.segments.length &&
        'length_ft' in patch
      ) {
        const newL = Math.max(0, Number(String(merged.length_ft).replace(/,/g, '')) || 0);
        const grossL = grossLengthFtForSketchEdit(idx, newL, sketch);
        if (grossL > 0) {
          const sk = adjustLayoutDrawingSegmentLength(sketch, idx, grossL);
          if (sk) {
            queueMicrotask(() => {
              setLayoutSketchData(sk as LayoutSketchDrawingPayload);
              setLayoutCanvasRemountKey((k) => k + 1);
            });
          }
        }
      }
      return next;
    });
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
    setHybVGates(syncWidth);
    setHybHGates(syncWidth);

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
    setHybVGates((rows) => shiftGatePlacementIndices(rows, placementIndex));
    setHybHGates((rows) => shiftGatePlacementIndices(rows, placementIndex));

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

  function removeHybVGate(id: string) {
    const row = hybVGates.find((r) => r.id === id);
    if (row?.sketchPlacementIndex != null) {
      removeSketchLinkedGate(row.sketchPlacementIndex);
      return;
    }
    setHybVGates((rows) => rows.filter((r) => r.id !== id));
  }

  function removeHybHGate(id: string) {
    const row = hybHGates.find((r) => r.id === id);
    if (row?.sketchPlacementIndex != null) {
      removeSketchLinkedGate(row.sketchPlacementIndex);
      return;
    }
    setHybHGates((rows) => rows.filter((r) => r.id !== id));
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
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Draw your fence, pick the type, and get a ready-to-order parts list.
        </p>

        <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            {
              n: '1',
              title: 'Draw the layout',
              desc: 'Sketch the fence line and drop in gates.',
            },
            {
              n: '2',
              title: 'Pick the fence type',
              desc: 'PVC / vinyl, chain link, or hybrid.',
            },
            {
              n: '3',
              title: 'Get your materials',
              desc: 'A full parts list you can copy or print.',
            },
          ].map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {s.n}
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                <div className="text-xs leading-snug text-slate-500">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" className={btnReset} onClick={resetMaterialCalculator}>
            Start over
          </button>
          <p className="text-xs text-slate-500">
            {!contractorId
              ? 'Sign in to automatically save your work in this browser.'
              : 'Your work saves automatically in this browser. Use “Start over” to clear everything.'}
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Need a per-panel parts list with custom items?{' '}
          <Link href="/dashboard/material-calculator/pvc" className="font-medium text-blue-600 hover:underline">
            Open the detailed PVC builder
          </Link>
          .
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
      <section className={card}>
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Fence type</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${tabBase} ${tab === 'pvc' ? tabActive : tabIdle}`}
                onClick={() => setTab('pvc')}
              >
                <span className="text-sm font-semibold">PVC / Vinyl</span>
                <span className={`text-xs ${tab === 'pvc' ? 'text-white/70' : 'text-slate-500'}`}>Panels & gates</span>
              </button>
              <button
                type="button"
                className={`${tabBase} ${tab === 'chain' ? tabActive : tabIdle}`}
                onClick={() => setTab('chain')}
              >
                <span className="text-sm font-semibold">Chain Link</span>
                <span className={`text-xs ${tab === 'chain' ? 'text-white/70' : 'text-slate-500'}`}>Mesh & rails</span>
              </button>
              <button
                type="button"
                className={`${tabBase} ${tab === 'hybrid_h' ? tabActive : tabIdle}`}
                onClick={() => setTab('hybrid_h')}
              >
                <span className="text-sm font-semibold">Hybrid Horizontal</span>
                <span className={`text-xs ${tab === 'hybrid_h' ? 'text-white/70' : 'text-slate-500'}`}>
                  WPC / Aluminum boards
                </span>
              </button>
              <button
                type="button"
                className={`${tabBase} ${tab === 'hybrid_v' ? tabActive : tabIdle}`}
                onClick={() => setTab('hybrid_v')}
              >
                <span className="text-sm font-semibold">Hybrid Vertical</span>
                <span className={`text-xs ${tab === 'hybrid_v' ? 'text-white/70' : 'text-slate-500'}`}>
                  PVC panels 6&apos;4&quot;
                </span>
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
                <div className="min-w-[10rem] flex-1 sm:max-w-[11rem]">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Post spacing (ft)
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    value={pvcPanelSpacingFt}
                    onChange={(e) => setPvcPanelSpacingFt(e.target.value)}
                    className={`${field} w-full tabular-nums`}
                  />
                </div>
                <p className="pb-2 text-xs text-slate-500 sm:max-w-md">
                  Standard spacing is {defaultFmsPvcPanelSpacingFt(pvcPanelModule).toFixed(2)} ft for{' '}
                  {FMS_PVC_PANEL_HEIGHT_LABELS[pvcPanelModule].toLowerCase()}. Enter any spacing you need — panel and
                  post counts update for every run.
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job name or address
              </label>
              <input
                type="text"
                value={jobAddress}
                onChange={(e) => setJobAddress(e.target.value)}
                placeholder="e.g. 53 Rothesay Ave — backyard"
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
            {tab === 'hybrid_h' ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Color (label only)
                </label>
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
            ) : null}
            {tab === 'hybrid_v' ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Color (label only)
                </label>
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
            ) : null}
          </div>
        </div>
      </section>

      <div className={stageLabel}>
        <span>Build your fence</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-violet-50/25 px-5 py-4">
          <h2 className={h2}>Draw your fence layout</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sketch each run and tap to drop in gates — the lengths fill in below automatically, so you only measure once.
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
              onDrawingChange={setLayoutSketchData}
            />
            {(lines.some((l) => l.fromSketch) || chainLines.some((l) => l.fromSketch)) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setLines((prev) => prev.map((l) => ({ ...l, fromSketch: false })));
                    setChainLines((prev) => prev.map((l) => ({ ...l, fromSketch: false })));
                  }}
                >
                  Edit runs by hand
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {tab === 'pvc' && (
        <>
          <section className={card}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
              <h2 className={h2}>Fence runs</h2>
              <p className="mt-1 text-xs text-slate-500">
                Filled in from your sketch. Adjust a length or add a run by hand if needed.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {lines.map((row, idx) =>
                row.fromSketch ? (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3 ring-1 ring-slate-900/[0.03]"
                  >
                    <span className="text-sm font-semibold text-slate-800">{row.label || `Run ${idx + 1}`}</span>
                    <span className="text-sm text-slate-600">
                      {Number(row.length_ft) || 0} ft · {formatPvcPanelSummary(row.panel_module, effectivePvcPanelSpacingFt)}
                      {Number(row.u_channel) > 0 ? ' · ends at a wall' : ''}
                    </span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                      From sketch
                    </span>
                  </div>
                ) : (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 ring-1 ring-slate-900/[0.03]"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">Run {idx + 1}</span>
                    <button type="button" className={btnGhost} onClick={() => removeLine(row.id)}>
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
                        Panel height · spacing
                      </label>
                      <p className={`${field} w-full bg-slate-100 text-slate-600`}>
                        {formatPvcPanelSummary(row.panel_module, effectivePvcPanelSpacingFt)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        How this run ends
                      </label>
                      <select
                        value={row.end_preset}
                        onChange={(e) => updateLine(row.id, { end_preset: e.target.value as LineEndPreset })}
                        disabled={row.fromSketch}
                        className={`${field} w-full disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                      >
                        <option value="h_continuous">Stands on its own — post at each end (standard)</option>
                        <option value="u_at_end">One end butts to a wall (U-channel)</option>
                        <option value="custom">Custom (advanced)</option>
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

          <section ref={pvcGatesSectionRef} className={card}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50/40 via-white to-slate-50/80 px-5 py-4">
              <h2 className={h2}>Gates</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter each gate&apos;s opening width and posts. Gates from your sketch appear here automatically.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {renderPvcGateSection('Walk gates (small)', 'Openings under 59.5″.', 'short', shortGates)}
              {renderPvcGateSection('Single gates', 'Openings 65.5″ and wider.', 'single', singleGates)}
              {renderPvcGateSection('Double gates', 'Openings 106″ and wider.', 'double', doubleGates)}
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Extra items <span className="font-normal text-slate-400">(optional)</span></h2>
              <p className="mt-1 text-xs text-slate-500">
                Add extra quantities when the standard count isn&apos;t enough. Rail, board, and post pairs share one
                number — board stiffeners are calculated at 3 per 16 boards (rounded up). Leave blank to skip.
              </p>
            </div>
            <div className="p-5">
              <button type="button" className={btnGhost} onClick={() => setMasterExtrasOpen((o) => !o)}>
                {masterExtrasOpen ? 'Hide extra items' : 'Add extra items'}
              </button>
              {masterExtrasOpen && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {MASTER_EXTRA_GROUPS.map((g) => {
                    const boardStiffHint =
                      g.mode === 'board_stiffener_ratio' && masterExtras.m8
                        ? boardExtraStiffenerCount(Number(String(masterExtras.m8).replace(/,/g, '')) || 0)
                        : 0;
                    return (
                      <div key={g.keys.join('-')}>
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                          {g.label}
                          {g.mode === 'board_stiffener_ratio' ? (
                            <span className="ml-1 font-normal normal-case text-slate-400">
                              (3 stiffeners per 16 boards)
                            </span>
                          ) : null}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={groupedExtraDisplayValue(g, masterExtras)}
                          onChange={(e) => setMasterExtras((p) => applyGroupedExtraChange(g, e.target.value, p))}
                          className={`${field} w-full`}
                          placeholder="0"
                        />
                        {boardStiffHint > 0 ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            +{boardStiffHint} board stiffener{boardStiffHint === 1 ? '' : 's'}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  {MASTER_EXTRA_SOLO.map((s) => (
                    <div key={s.key}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                        {s.label}
                        {s.integerOnly ? (
                          <span className="ml-1 font-normal normal-case text-slate-400">(whole #)</span>
                        ) : null}
                      </label>
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
              )}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                      Additional boards (%)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={extraBoardsPct}
                      onChange={(e) => setExtraBoardsPct(sanitizeExtraInput(e.target.value, false))}
                      className={`${field} w-24`}
                      placeholder="0"
                    />
                  </div>
                  <p className="pb-2 text-xs text-slate-500">
                    Adds this % more boards to the material list (rounded up to whole boards).
                    {extraBoardsPctAdd > 0 ? (
                      <span className="ml-1 font-semibold text-slate-700">
                        +{extraBoardsPctAdd} board{extraBoardsPctAdd === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className={stageLabel}>
            <span>Your materials</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={h2}>Material list</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your full parts list in {pvcBreakdownColour}. Uncheck items the customer already has — they stay
                    visible here but are left off PDFs and supplier quotes. Cut stock is rounded up once for the whole
                    job.
                  </p>
                </div>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    skipPostsForTab(
                      'pvc',
                      pvcMaster.filter((r) => r.label?.trim() && !r.header).map((r) => r.label)
                    )
                  }
                >
                  Skip posts
                </button>
              </div>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Itemized breakdown — {pvcBreakdownColour}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                        <th className="w-10 px-1 py-2">Inc.</th>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adobeRows.map((r) => {
                        const included = isMaterialIncluded(materialExclusions, 'pvc', r.label);
                        return (
                          <tr
                            key={r.row}
                            className={`border-b border-slate-100 ${!included ? 'bg-slate-50/80 opacity-55' : ''}`}
                          >
                            <td className="w-10 px-1 py-1.5">
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={(e) => toggleMaterialInclude('pvc', r.label, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-slate-500">{r.row}</td>
                            <td
                              className={`px-2 py-1.5 ${included ? 'text-slate-800' : 'text-slate-500 line-through'}`}
                            >
                              {r.label}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right tabular-nums ${included ? 'text-slate-900' : 'text-slate-400 line-through'}`}
                            >
                              {r.qty}
                            </td>
                          </tr>
                        );
                      })}
                      {adobeRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-slate-500">
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
                  Order quantities — {pvcBreakdownColour}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                        <th className="w-10 px-1 py-2">Inc.</th>
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Total</th>
                        <th className="px-2 py-2 text-right">Packs</th>
                        <th className="px-2 py-2 text-right">Extras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pvcMaster.map((r, idx) => {
                        if (r.header) {
                          return (
                            <tr key={`${idx}-${r.label}`} className="border-b border-slate-200 bg-slate-100">
                              <td
                                colSpan={5}
                                className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600"
                              >
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
                                  title={included ? 'Include on order' : 'Excluded from order'}
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
                            <td
                              className={`px-2 py-1.5 text-right tabular-nums ${included ? 'text-slate-700' : 'text-slate-400 line-through'}`}
                            >
                              {formatPacksCell(r.packs ?? 0) || '\u00a0'}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right tabular-nums ${included ? 'text-slate-600' : 'text-slate-400 line-through'}`}
                            >
                              {formatLooseExtra(r.loose ?? 0) || '\u00a0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={copyBom} className={btn}>
                Copy list
              </button>
              <button type="button" className={btnGhost} onClick={() => void downloadMasterMaterialListPdf()}>
                Download PDF
              </button>
            </div>
          </section>

          <CollapsibleCard
            title="Fence parts summary"
            subtitle="Fence parts only (no gates), with total panels and estimated concrete."
          >
            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Item</th>
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
                    <td className="px-2 py-2 font-medium text-slate-800">Total panels</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {pvcJob.sum_whole_panels}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <td className="px-2 py-2 font-medium text-slate-800">Concrete bags (est.)</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {pvcJob.concrete_bags_est}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Run-by-run breakdown" subtitle="Parts needed for each individual run of fence.">
            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Run</th>
                    <th className="px-2 py-2 text-right">Length (ft)</th>
                    <th className="px-2 py-2">Panel</th>
                    <th className="px-2 py-2 text-right">Panels</th>
                    <th className="px-2 py-2 text-right">H-post</th>
                    <th className="px-2 py-2 text-right">U-channel</th>
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
                        {formatPvcPanelSummary(ln.input.panel_module, ln.input.panel_spacing_ft ?? effectivePvcPanelSpacingFt)}
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
          </CollapsibleCard>
        </>
      )}

      {tab === 'chain' && (
        <>
          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Chain link fence</h2>
              <p className="mt-1 text-xs text-slate-500">
                Runs come from your sketch. Adjust a length or add a run by hand if needed.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Step 1 — Set your stock sizes
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Rails come in different lengths (e.g. 10&apos; regional, 19.33&apos; ours) — set this first.
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
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
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Mesh roll length (ft)</label>
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
              </div>
              {chainLines.map((row, idx) =>
                row.fromSketch ? (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-800">{row.label || `Run ${idx + 1}`}</span>
                    <span className="text-sm text-slate-600">{Number(row.length_ft) || 0} ft</span>
                    <span className="text-xs text-slate-500">{chainRunInfoText(row.length_ft)}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                      From sketch
                    </span>
                  </div>
                ) : (
                <div
                  key={row.id}
                  className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-4"
                >
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Label</label>
                    <input
                      type="text"
                      value={row.label}
                      disabled={row.fromSketch}
                      onChange={(e) =>
                        setChainLines((rows) => rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))
                      }
                      className={`${field} w-32 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Length (ft)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={row.length_ft}
                      disabled={row.fromSketch}
                      onChange={(e) =>
                        setChainLines((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, length_ft: e.target.value } : r))
                        )
                      }
                      className={`${field} w-28 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">End posts</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.terminal_post}
                      disabled={row.fromSketch}
                      onChange={(e) =>
                        setChainLines((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, terminal_post: e.target.value } : r))
                        )
                      }
                      className={`${field} w-24 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                    />
                  </div>
                  <button type="button" className={btnGhost} onClick={() => removeChainLine(row.id)}>
                    Remove
                  </button>
                  {chainRunInfoText(row.length_ft) ? (
                    <span className="w-full text-xs text-slate-500">{chainRunInfoText(row.length_ft)}</span>
                  ) : null}
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

          <section ref={chainGatesSectionRef} className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Chain link gates</h2>
              <p className="mt-1 text-xs text-slate-500">
                Add each gate by its opening width. Gates you place on the layout sketch show up here automatically.
              </p>
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
                        onChange={(e) => {
                          const w = e.target.value;
                          if (g.sketchPlacementIndex != null) {
                            applySketchGateWidth(g.sketchPlacementIndex, w);
                            return;
                          }
                          setChainGates((rows) =>
                            rows.map((r) => (r.id === g.id ? { ...r, width_in: w } : r))
                          );
                        }}
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
                    <button type="button" className={btnGhost} onClick={() => removeChainGate(g.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

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
            <span>Your materials</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={h2}>Master material list</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Uncheck items the customer already has. Excluded lines are omitted from PDFs and supplier quotes.
                  </p>
                </div>
                {chainMasterRows ? (
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
                ) : null}
              </div>
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
          <section className={card}>
            <div className="border-b border-amber-100 bg-amber-50/30 px-5 py-4">
              <h2 className={h2}>{fmsHybridHoBlockTitle(hybHFamily, hybHHeight)}</h2>
              <p className="mt-1 text-xs text-slate-600">
                Horizontal-board hybrid, 6&apos; post spacing. Runs come from your sketch — adjust or add runs by hand
                if needed. Each run is one fence-line block on the Excel sheet.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Material</label>
                <select
                  value={hybHFamily}
                  onChange={(e) => setHybHFamily(e.target.value as FmsHybridHoFamily)}
                  className={`${field} w-full`}
                >
                  {FMS_HYBRID_HO_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
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
            </div>
            <div className="space-y-4 border-t border-slate-100 px-5 py-4">
              {hybridHJob.runs.map(({ row, result }, idx) => (
                <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                  {row.fromSketch ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="text-sm font-semibold text-slate-800">{row.label || `Run ${idx + 1}`}</span>
                    <span className="text-sm text-slate-600">{Number(row.length_ft) || 0} ft</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                      From sketch
                    </span>
                    <button type="button" className={btnGhost} onClick={() => removeHybHLine(row.id)}>
                      Remove
                    </button>
                  </div>
                  ) : (
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Label</label>
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) =>
                          setHybHLines((rows) => rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))
                        }
                        className={`${field} w-32`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                        Length (ft)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.length_ft}
                        onChange={(e) =>
                          setHybHLines((rows) =>
                            rows.map((r) => (r.id === row.id ? { ...r, length_ft: e.target.value } : r))
                          )
                        }
                        className={`${field} w-28`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                        H posts (0–2)
                      </label>
                      <select
                        value={row.h_post}
                        onChange={(e) =>
                          setHybHLines((rows) =>
                            rows.map((r) =>
                              r.id === row.id ? { ...r, h_post: Number(e.target.value) as 0 | 1 | 2 } : r
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
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                        U channel (0–2)
                      </label>
                      <select
                        value={row.u_channel}
                        onChange={(e) =>
                          setHybHLines((rows) =>
                            rows.map((r) =>
                              r.id === row.id ? { ...r, u_channel: Number(e.target.value) as 0 | 1 | 2 } : r
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
                    <button type="button" className={btnGhost} onClick={() => removeHybHLine(row.id)}>
                      Remove
                    </button>
                  </div>
                  )}
                  {result ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-500">
                        Panels {fmtQty(result.panels_raw)} → rounded {fmtQty(result.panels_half)} → whole{' '}
                        {result.panels_whole} · Posts {result.posts}
                      </p>
                      <HybridItemTable rows={result.rows} />
                    </div>
                  ) : null}
                </div>
              ))}
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
                    },
                  ])
                }
              >
                + Add run
              </button>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Hybrid horizontal gates</h2>
              <p className="mt-1 text-xs text-slate-500">
                Three Excel gate blocks: standard gate (under 56&Prime;), gate + side panel (56–125&Prime;) and double
                gate (106–202&Prime;).
              </p>
            </div>
            <div className="space-y-3 p-5">
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  setHybHGates((g) => [
                    ...g,
                    { id: newLineId(), kind: 'simple', width_in: '', posts: 1, adjoining: 0 },
                  ])
                }
              >
                + Add gate
              </button>
              {hybridHJob.gates.map(({ gate: g, rows }) => (
                <div key={g.id} className="rounded-lg border border-slate-100 bg-white p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                        Gate type
                      </label>
                      <select
                        value={g.kind}
                        onChange={(e) =>
                          setHybHGates((rows2) =>
                            rows2.map((r) =>
                              r.id === g.id ? { ...r, kind: e.target.value as HybridHGateKind } : r
                            )
                          )
                        }
                        className={`${field} w-56`}
                      >
                        <option value="simple">Gate (under 56&Prime;)</option>
                        <option value="adjacent">Gate + side panel (56–125&Prime;)</option>
                        <option value="double">Double gate (106–202&Prime;)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                        Gate line width (in)
                      </label>
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
                          setHybHGates((rows2) =>
                            rows2.map((r) => (r.id === g.id ? { ...r, width_in: w } : r))
                          );
                        }}
                        className={`${field} w-28`}
                      />
                    </div>
                    {g.kind === 'simple' ? (
                      <div>
                        <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                          Posts (0–2)
                        </label>
                        <select
                          value={g.posts}
                          onChange={(e) =>
                            setHybHGates((rows2) =>
                              rows2.map((r) =>
                                r.id === g.id ? { ...r, posts: Number(e.target.value) as 0 | 1 | 2 } : r
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
                    ) : (
                      <div>
                        <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                          Adjoining fence
                        </label>
                        <select
                          value={g.adjoining}
                          onChange={(e) =>
                            setHybHGates((rows2) =>
                              rows2.map((r) =>
                                r.id === g.id ? { ...r, adjoining: Number(e.target.value) as 0 | 1 | 2 } : r
                              )
                            )
                          }
                          className={`${field} w-44`}
                        >
                          <option value={0}>Adjoins existing fence</option>
                          <option value={1}>Standalone</option>
                          {g.kind === 'adjacent' ? <option value={2}>Gate in the middle</option> : null}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => removeHybHGate(g.id)}
                    >
                      Remove
                    </button>
                  </div>
                  {rows ? (
                    <div className="mt-3">
                      <HybridItemTable rows={rows} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

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
            <span>Your materials</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Job totals — {fmsHybridHoBlockTitle(hybHFamily, hybHHeight)}</h2>
              <p className="mt-1 text-xs text-slate-600">
                Colour: <strong className="font-medium text-slate-800">{hybridWpcColour}</strong>. Summed across all
                runs and gates, line by line from the Excel sheet.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {!hybridHJob.hasAny ? (
                <p className="text-sm text-slate-500">Enter at least one fence run length or gate width.</p>
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Master material list</h3>
                    <p className="mb-2 text-[11px] text-slate-500">
                      Order-ready SKUs: each U-channel = 1 outer + 1 inner, rail screws (1.5&quot;) = 2 per long screw
                      (plus matching plugs), concrete = 2.5 per post. Cut stock (rails, boards, stiffeners) is shared
                      across runs and rounded up once for the whole job to minimize scrap.
                    </p>
                    <HybridItemTable
                      rows={hybridHJob.master}
                      groupWare
                      tab="hybrid_h"
                      materialExclusions={materialExclusions}
                      onToggleInclude={(label, included) => toggleMaterialInclude('hybrid_h', label, included)}
                    />
                  </div>
                  <details className="rounded-xl border border-slate-100 bg-slate-50/40">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
                      Calculator item totals (Excel rows)
                    </summary>
                    <div className="px-4 pb-4">
                      <HybridItemTable rows={hybridHJob.totals} />
                    </div>
                  </details>
                </>
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
          <section className={card}>
            <div className="border-b border-blue-100 bg-blue-50/20 px-5 py-4">
              <h2 className={h2}>{FMS_HYBRID_VE_BLOCK_TITLE}</h2>
              <p className="mt-1 text-xs text-slate-600">
                Vertical-panel PVC hybrid, 8&apos; post spacing. Runs come from your sketch — adjust or add runs by
                hand if needed. Each run is one fence-line block on the Excel sheet.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {hybridVJob.runs.map(({ row, result }, idx) => (
                <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                  {row.fromSketch ? (
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-semibold text-slate-800">{row.label || `Run ${idx + 1}`}</span>
                      <span className="text-sm text-slate-600">{Number(row.length_ft) || 0} ft</span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                        From sketch
                      </span>
                      <button type="button" className={btnGhost} onClick={() => removeHybVLine(row.id)}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Label</label>
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) =>
                            setHybVLines((rows) =>
                              rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r))
                            )
                          }
                          className={`${field} w-32`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                          Length (ft)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={row.length_ft}
                          onChange={(e) =>
                            setHybVLines((rows) =>
                              rows.map((r) => (r.id === row.id ? { ...r, length_ft: e.target.value } : r))
                            )
                          }
                          className={`${field} w-28`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                          H posts (0–2)
                        </label>
                        <select
                          value={row.h_post}
                          onChange={(e) =>
                            setHybVLines((rows) =>
                              rows.map((r) =>
                                r.id === row.id ? { ...r, h_post: Number(e.target.value) as 0 | 1 | 2 } : r
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
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                          U channel (0–2)
                        </label>
                        <select
                          value={row.u_channel}
                          onChange={(e) =>
                            setHybVLines((rows) =>
                              rows.map((r) =>
                                r.id === row.id ? { ...r, u_channel: Number(e.target.value) as 0 | 1 | 2 } : r
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
                      <button type="button" className={btnGhost} onClick={() => removeHybVLine(row.id)}>
                        Remove
                      </button>
                    </div>
                  )}
                  {result ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-500">
                        Panels {fmtQty(result.panels_raw)} → rounded {fmtQty(result.panels_half)} → whole{' '}
                        {result.panels_whole} · Posts {result.posts}
                      </p>
                      <HybridItemTable rows={result.rows} />
                    </div>
                  ) : null}
                </div>
              ))}
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
                    },
                  ])
                }
              >
                + Add run
              </button>
            </div>
          </section>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Hybrid vertical gates</h2>
              <p className="mt-1 text-xs text-slate-500">
                Single gate (under 56&Prime;) and double gate (max 96&Prime;) — gates placed on the sketch show up here
                automatically.
              </p>
            </div>
            <div className="space-y-3 p-5">
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  setHybVGates((g) => [...g, { id: newLineId(), kind: 'single', width_in: '', posts: 1 }])
                }
              >
                + Add gate
              </button>
              {hybridVJob.gates.map(({ gate: g, rows }) => (
                <div key={g.id} className="rounded-lg border border-slate-100 bg-white p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                        Gate type
                      </label>
                      <select
                        value={g.kind}
                        onChange={(e) =>
                          setHybVGates((rows2) =>
                            rows2.map((r) =>
                              r.id === g.id ? { ...r, kind: e.target.value === 'double' ? 'double' : 'single' } : r
                            )
                          )
                        }
                        className={`${field} w-48`}
                      >
                        <option value="single">Single gate (under 56&Prime;)</option>
                        <option value="double">Double gate (max 96&Prime;)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                        Gate line width (in)
                      </label>
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
                          setHybVGates((rows2) =>
                            rows2.map((r) => (r.id === g.id ? { ...r, width_in: w } : r))
                          );
                        }}
                        className={`${field} w-28`}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">
                        Posts (0–2)
                      </label>
                      <select
                        value={g.posts}
                        onChange={(e) =>
                          setHybVGates((rows2) =>
                            rows2.map((r) =>
                              r.id === g.id ? { ...r, posts: Number(e.target.value) as 0 | 1 | 2 } : r
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
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => removeHybVGate(g.id)}
                    >
                      Remove
                    </button>
                  </div>
                  {rows ? (
                    <div className="mt-3">
                      <HybridItemTable rows={rows} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

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
            <span>Your materials</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section className={card}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className={h2}>Job totals — {FMS_HYBRID_VE_BLOCK_TITLE}</h2>
              <p className="mt-1 text-xs text-slate-600">
                Colour: <strong className="font-medium text-slate-800">{hybridPvcColour}</strong>. Summed across all
                runs and gates, line by line from the Excel sheet.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {!hybridVJob.hasAny ? (
                <p className="text-sm text-slate-500">Enter at least one fence run length or gate width.</p>
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Master material list</h3>
                    <p className="mb-2 text-[11px] text-slate-500">
                      Order-ready SKUs: each U-channel = 1 outer + 1 inner, rail screws (1.5&quot;) = 2 per long screw
                      (plus matching plugs), concrete = 2.5 per post. Cut stock (rails, boards, stiffeners) is shared
                      across runs and rounded up once for the whole job to minimize scrap.
                    </p>
                    <HybridItemTable
                      rows={hybridVJob.master}
                      groupWare
                      tab="hybrid_v"
                      materialExclusions={materialExclusions}
                      onToggleInclude={(label, included) => toggleMaterialInclude('hybrid_v', label, included)}
                    />
                  </div>
                  <details className="rounded-xl border border-slate-100 bg-slate-50/40">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
                      Calculator item totals (Excel rows)
                    </summary>
                    <div className="px-4 pb-4">
                      <HybridItemTable rows={hybridVJob.totals} />
                    </div>
                  </details>
                </>
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
          onDownloadMasterPdf={() => void downloadMasterMaterialListPdf()}
          buildMasterPdfBlob={tab === 'pvc' ? buildMasterMaterialListPdfBlob : undefined}
          masterPdfAvailable={tab === 'pvc' && !fmsQuoteMaterialUnsupported}
          buildMaterialRowsForQuote={buildSupplierMaterialQuoteLines}
          quoteDetailHref={`/dashboard/supplier/contractor-quotes/${encodeURIComponent(materialRequestId)}`}
          calculatorBlocked={Boolean(fmsQuoteMaterialUnsupported)}
        />
      ) : null}
      </div>
    </div>
  );
}
