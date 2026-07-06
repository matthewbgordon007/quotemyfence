/**
 * Adobe colour breakdown (J-column style totals) + Master Material List column C math for PVC.
 *
 * Formulas are taken verbatim from `Adobe - Material List Breakdown` and `Master Material List`
 * in `docs/2026 FMS - Fencing Material Calculator.xlsx` (openpyxl extraction). Master column C
 * does **not** wrap these sums in `ROUND` — values are raw IEEE doubles like Excel.
 *
 * Key references:
 * - Adobe J2…J14, J17…J33: `=SUM(Bn:In)` (row 17: `=SUM(B17:I17)/12`).
 * - Master C5: `=C10*2.5` where C10 is H-Post row (`J4+J19+M10`).
 * - Master C27: `'Adobe - Material List Breakdown'!J2+'Adobe - Material List Breakdown'!J17`
 * - Master C28: `=COUNT('Adobe - Material List Breakdown'!B17:E17)` (we pass gate count from the app).
 */

import { excelRoundUp } from '@/lib/fms-excel-math';
import {
  resolveFmsCalculatorRecipe,
  FENCE_SKU_CATALOG_SLOT,
  catalogSlotLabel,
  enabledCustomCatalogItems,
  isCatalogSlotEnabled,
  type FmsCalculatorRecipeV1,
  type FmsProductSlot,
} from '@/lib/fms-calculator-recipe';
import { LARGE_WARE_TITLE, SMALL_WARE_TITLE, splitWare } from '@/lib/material-ware';
import {
  boardStiffenersForBoardCount,
  splitCoupledPack,
  splitIntoPacks,
  splitPostGalvPack,
  type PvcPackLine,
} from '@/lib/pvc-material-packs';
import type { FmsPvcAdobeGateMap } from '@/lib/fms-pvc-gates-calculator';
import type { FmsPvcFenceLineResult } from '@/lib/fms-pvc-material-calculator';

/** Optional manual adders from Master sheet column M (same row as the formula row). */
export interface FmsPvcMasterExtras {
  m6?: number;
  m7?: number;
  m8?: number;
  m9?: number;
  m10?: number;
  m11?: number;
  m12?: number;
  m13?: number;
  m14?: number;
  m15?: number;
  m16?: number;
  m19?: number;
  m20?: number;
  m21?: number;
  m22?: number;
  m23?: number;
  m24?: number;
}

function j(adobe: Record<number, number>, row: number): number {
  return adobe[row] ?? 0;
}

/**
 * Sum fence lines into Adobe rows 2–14; gates into 17–33; row 17 = SUM(gate widths in) / 12 (no ROUND in Excel).
 *
 * Adobe S-column totals sum each fence line's rounded D/I finals (per-line ROUNDUP), not one ROUNDUP of raw sums.
 */
export function buildPvcAdobeBreakdown(
  fenceLines: FmsPvcFenceLineResult[],
  gateRows: FmsPvcAdobeGateMap,
  gateWidthInchesSum: number
): Record<number, number> {
  const a: Record<number, number> = {};

  for (const line of fenceLines) {
    a[2] = (a[2] ?? 0) + line.total_whole_panels;
    a[3] = (a[3] ?? 0) + line.galvanized_post;
    a[4] = (a[4] ?? 0) + line.h_post;
    a[5] = (a[5] ?? 0) + line.cap_h_post;
    a[6] = (a[6] ?? 0) + line.rail;
    a[7] = (a[7] ?? 0) + line.rail_stiffener;
    a[8] = (a[8] ?? 0) + line.board;
    a[9] = (a[9] ?? 0) + line.board_stiffener;
    a[10] = (a[10] ?? 0) + line.long_screw;
    a[11] = (a[11] ?? 0) + line.short_screw;
    a[12] = (a[12] ?? 0) + line.plug;
    a[13] = (a[13] ?? 0) + line.u_channel;
    a[14] = (a[14] ?? 0) + line.h_post_stiffener;
  }

  for (const [rk, rv] of Object.entries(gateRows)) {
    const row = Number(rk);
    if (!Number.isFinite(row) || !Number.isFinite(rv)) continue;
    a[row] = (a[row] ?? 0) + rv;
  }

  a[17] = gateWidthInchesSum > 0 ? gateWidthInchesSum / 12 : 0;

  return a;
}

/** Subtract shared-joint double counts after per-run Adobe rows are summed. */
export function applySharedBoundaryDedupToAdobeBreakdown(
  adobe: Record<number, number>,
  dedup: { h_post: number; u_channel: number },
  recipe?: FmsCalculatorRecipeV1 | null
): Record<number, number> {
  const h = Math.max(0, dedup.h_post);
  const u = Math.max(0, dedup.u_channel);
  if (h <= 0 && u <= 0) return adobe;
  const r = resolveFmsCalculatorRecipe(recipe);
  const next = { ...adobe };
  if (h > 0) {
    next[3] = Math.max(0, (next[3] ?? 0) - h);
    next[4] = Math.max(0, (next[4] ?? 0) - h);
    next[5] = Math.max(0, (next[5] ?? 0) - h);
    next[12] = Math.max(0, (next[12] ?? 0) - r.fence.per_panel.short_screw * h);
  }
  if (u > 0) {
    next[13] = Math.max(0, (next[13] ?? 0) - u);
    next[14] = Math.max(0, (next[14] ?? 0) - u);
  }
  return next;
}

export interface FmsPvcMasterRow {
  label: string;
  qty: number;
  /** Full packs to grab (PVC packaging rules). */
  packs?: number;
  /** Loose quantity beyond full packs — shown as +N in Extras column. */
  loose?: number;
  /** Section divider row ("Large ware" / "Small ware") — no quantity. */
  header?: boolean;
}

function masterRow(label: string, line: PvcPackLine & { packs?: number }): FmsPvcMasterRow {
  return {
    label,
    qty: line.total,
    packs: line.packs,
    loose: line.loose,
  };
}

function masterRowPlain(label: string, qty: number): FmsPvcMasterRow {
  return { label, qty };
}

/** Extra qty added by a percentage uplift (e.g. 5 → +5%, rounded up to whole units). */
export function pvcQtyPercentAdd(qty: number, percent?: number): number {
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= 0 || qty <= 0) return 0;
  return excelRoundUp((qty * pct) / 100, 0);
}

/** @deprecated Use pvcQtyPercentAdd */
export const pvcBoardsPercentAdd = pvcQtyPercentAdd;

export type FmsPvcMasterPercentUplifts = {
  boardsPct?: number;
  largeScrewPct?: number;
  shortScrewPct?: number;
};

function resolvePercentUplifts(uplifts?: FmsPvcMasterPercentUplifts | number): FmsPvcMasterPercentUplifts {
  if (typeof uplifts === 'number') return { boardsPct: uplifts };
  return uplifts ?? {};
}

export function computePvcMasterColumn(
  adobe: Record<number, number>,
  extras: FmsPvcMasterExtras,
  gateCount: number,
  totalFenceLinearFt?: number,
  uplifts?: FmsPvcMasterPercentUplifts | number,
  recipe?: FmsCalculatorRecipeV1 | null
): FmsPvcMasterRow[] {
  const pct = resolvePercentUplifts(uplifts);
  const r = resolveFmsCalculatorRecipe(recipe);
  const labels = r.master_labels;
  const packs = r.packs;
  const e = extras;
  const x = (m?: number) => (m != null && Number.isFinite(m) ? m : 0);

  const hPost = j(adobe, 4) + j(adobe, 19) + x(e.m10);
  const concrete = hPost * r.concrete_bags_per_h_post;

  const rail = j(adobe, 6) + j(adobe, 21) + x(e.m6);
  const railStiff = j(adobe, 7) + j(adobe, 22) + x(e.m7);
  const boardBase = j(adobe, 8) + j(adobe, 23) + x(e.m8);
  const boardPctAdd = pvcQtyPercentAdd(boardBase, pct.boardsPct);
  const board = boardBase + boardPctAdd;
  const boardStiffFromAdobe = j(adobe, 9) + j(adobe, 24) + x(e.m9);
  // Enforce 3 stiffeners per 16 boards (packaging rule). % uplift boards need matching stiffeners;
  // fence + gate adobe rows can under-count stiffeners vs total boards when summed separately.
  const boardStiff = Math.max(
    boardStiffFromAdobe + boardStiffenersForBoardCount(boardPctAdd, packs.board_per_pack, packs.board_stiffeners_per_pack),
    boardStiffenersForBoardCount(board, packs.board_per_pack, packs.board_stiffeners_per_pack)
  );
  const uChannel = j(adobe, 13) + j(adobe, 28) + x(e.m12);
  const hPostStiff = j(adobe, 14) + j(adobe, 33) + x(e.m13);
  const postFiller = x(e.m14);
  // Overhead and cross braces are always sold as whole units (no 0.5).
  const overhead = excelRoundUp(j(adobe, 30) + x(e.m15), 0);
  const diagonal = excelRoundUp(j(adobe, 29) + x(e.m16), 0);
  const postCap = j(adobe, 5) + j(adobe, 20) + x(e.m19);
  const holePlug = j(adobe, 12) + j(adobe, 27) + r.master_rollups.hole_plug_add + x(e.m20);
  const largeScrewBase = j(adobe, 10) + j(adobe, 26) + r.master_rollups.large_screw_add + x(e.m21);
  const largeScrewPctAdd = pvcQtyPercentAdd(largeScrewBase, pct.largeScrewPct);
  const largeScrew = largeScrewBase + largeScrewPctAdd;
  const shortScrewBase = j(adobe, 11) + j(adobe, 25) + x(e.m22);
  const shortScrewPctAdd = pvcQtyPercentAdd(shortScrewBase, pct.shortScrewPct);
  const shortScrew = shortScrewBase + shortScrewPctAdd;
  const latch = j(adobe, 31) + x(e.m23);
  const hinge = j(adobe, 32) + x(e.m24);

  const fenceLinearFt =
    Number.isFinite(totalFenceLinearFt) && (totalFenceLinearFt ?? 0) >= 0
      ? (totalFenceLinearFt as number)
      : j(adobe, 2);
  const totalLinearFt = fenceLinearFt + j(adobe, 17);

  const galv = j(adobe, 3) + j(adobe, 18) + x(e.m11);
  const boardPack = splitCoupledPack(board, boardStiff, packs.board_per_pack, packs.board_stiffeners_per_pack);
  const railPack = splitCoupledPack(rail, railStiff, packs.rail_per_pack, packs.rail_stiffeners_per_pack);
  const postPack = splitPostGalvPack(hPost, galv);
  const uChannelPack = splitIntoPacks(uChannel, packs.u_channel_per_pack);

  const wholePanels = j(adobe, 2);

  type SlotRow = { slot: FmsProductSlot; row: FmsPvcMasterRow };
  const slotRows: SlotRow[] = [
    { slot: 'concrete', row: masterRowPlain(labels.concrete, concrete) },
    { slot: 'rail', row: masterRow(labels.rail, railPack.primary) },
    { slot: 'rail_stiffener', row: masterRow(labels.rail_stiffener, railPack.secondary) },
    { slot: 'board', row: masterRow(labels.board, boardPack.primary) },
    { slot: 'board_stiffener', row: masterRow(labels.board_stiffener, boardPack.secondary) },
    { slot: 'h_post', row: masterRow(labels.h_post, postPack.hPost) },
    { slot: 'galvanized_post', row: masterRow(labels.galvanized_post, postPack.galv) },
    { slot: 'u_channel', row: masterRow(labels.u_channel, uChannelPack) },
    { slot: 'h_post_stiffener', row: masterRowPlain(labels.h_post_stiffener, hPostStiff) },
    { slot: 'post_filler', row: masterRowPlain(labels.post_filler, postFiller) },
    { slot: 'overhead_brace', row: masterRowPlain(labels.overhead_brace, overhead) },
    { slot: 'diagonal_brace', row: masterRowPlain(labels.diagonal_brace, diagonal) },
    { slot: 'base_plates', row: masterRowPlain(labels.base_plates, 0) },
    { slot: 'lattice', row: masterRowPlain(labels.lattice, 0) },
    { slot: 'post_cap', row: masterRowPlain(labels.post_cap, postCap) },
    { slot: 'hole_plug', row: masterRowPlain(labels.hole_plug, holePlug) },
    { slot: 'large_screw', row: masterRowPlain(labels.large_screw, largeScrew) },
    { slot: 'short_screw', row: masterRowPlain(labels.short_screw, shortScrew) },
    { slot: 'latch', row: masterRowPlain(labels.latch, latch) },
    { slot: 'hinge', row: masterRowPlain(labels.hinge, hinge) },
    { slot: 'drop_rod', row: masterRowPlain(labels.drop_rod, 0) },
  ];

  const items: FmsPvcMasterRow[] = slotRows
    .filter(({ slot }) => isCatalogSlotEnabled(r, slot))
    .map(({ slot, row }) => ({
      ...row,
      label: catalogSlotLabel(r, slot, row.label),
    }));

  for (const custom of enabledCustomCatalogItems(r)) {
    if (!custom.surfaces?.includes('master')) continue;
    const qty = wholePanels * (custom.qty_per_panel ?? 0);
    if (qty <= 0) continue;
    items.push(masterRowPlain(custom.label, qty));
  }
  const { large, small } = splitWare(items, (r) => r.label);

  return [
    { label: LARGE_WARE_TITLE, qty: 0, header: true },
    ...large,
    { label: SMALL_WARE_TITLE, qty: 0, header: true },
    ...small,
    { label: '', qty: 0 },
    { label: 'Total Linear Ft', qty: totalLinearFt },
    { label: 'Total Gates', qty: gateCount },
  ];
}

/** Human-readable Adobe J totals for UI / TSV export (raw numeric values, no extra rounding). */
export function adobeBreakdownToRows(adobe: Record<number, number>): { label: string; row: number; qty: number }[] {
  const labels: Record<number, string> = {
    2: 'Panels',
    3: 'Galvanized Post',
    4: 'H Post',
    5: 'Cap (H Post)',
    6: 'Rail',
    7: 'Rail Stiffener',
    8: 'Board',
    9: 'Board Stiffener',
    10: 'Long Screw',
    11: 'Short Screw',
    12: 'Plug',
    13: 'U Channel',
    14: 'H Post Stiffener',
    17: 'Gate (Σ widths ÷ 12)',
    18: 'Gate — Galvanized Post',
    19: 'Gate — H Post',
    20: 'Gate — Cap (H post)',
    21: 'Gate — Rail',
    22: 'Gate — Rail Stiffener',
    23: 'Gate — Board',
    24: 'Gate — Board Stiffener',
    25: 'Gate — Short Screw',
    26: 'Gate — Long Screw',
    27: 'Gate — Plug',
    28: 'Gate — U Channel',
    29: 'Gate — Cross Brace',
    30: 'Gate — OverHead Brace',
    31: 'Gate — Latch kit',
    32: 'Gate — Hinge Kit',
    33: 'Gate — H Post Stiffener',
  };
  return Object.keys(adobe)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((row) => ({
      row,
      label: labels[row] ?? `Row ${row}`,
      qty: adobe[row] ?? 0,
    }));
}

/** Fence + gate totals on one line per material (matches how the master list groups items). */
export function adobeBreakdownToMergedRows(
  adobe: Record<number, number>,
  recipe?: FmsCalculatorRecipeV1 | null
): { label: string; qty: number }[] {
  const r = resolveFmsCalculatorRecipe(recipe);
  const j = (row: number) => adobe[row] ?? 0;
  const add = (...rows: number[]) => rows.reduce((acc, row) => acc + j(row), 0);

  const rowDefs: { slot: FmsProductSlot; qty: number; fallback: string }[] = [
    { slot: 'galvanized_post', qty: add(3, 18), fallback: 'Galvanized Post' },
    { slot: 'h_post', qty: add(4, 19), fallback: 'H Post' },
    { slot: 'cap_h_post', qty: add(5, 20), fallback: 'Cap (H Post)' },
    { slot: 'rail', qty: add(6, 21), fallback: 'Rail' },
    { slot: 'rail_stiffener', qty: add(7, 22), fallback: 'Rail Stiffener' },
    { slot: 'board', qty: add(8, 23), fallback: 'Board' },
    { slot: 'board_stiffener', qty: add(9, 24), fallback: 'Board Stiffener' },
    { slot: 'large_screw', qty: add(10, 26), fallback: 'Long Screw' },
    { slot: 'short_screw', qty: add(11, 25), fallback: 'Short Screw' },
    { slot: 'hole_plug', qty: add(12, 27), fallback: 'Plug' },
    { slot: 'u_channel', qty: add(13, 28), fallback: 'U Channel' },
    { slot: 'h_post_stiffener', qty: add(14, 33), fallback: 'H Post Stiffener' },
    { slot: 'diagonal_brace', qty: j(29), fallback: 'Cross Brace' },
    { slot: 'overhead_brace', qty: j(30), fallback: 'Overhead Brace' },
    { slot: 'latch', qty: j(31), fallback: 'Latch kit' },
    { slot: 'hinge', qty: j(32), fallback: 'Hinge Kit' },
  ];

  const items = rowDefs
    .filter(({ slot, qty }) => qty !== 0 && isCatalogSlotEnabled(r, slot))
    .map(({ slot, qty, fallback }) => ({
      label: catalogSlotLabel(r, slot, fallback),
      qty,
    }));

  const panels = j(2);
  if (panels > 0) {
    items.unshift({ label: 'Panels', qty: panels });
  }

  return items;
}
