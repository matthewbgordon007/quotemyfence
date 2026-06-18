/**
 * Excel parity for the two hybrid workbook tabs:
 *
 * `Horizontal Material Calculator ` — six fence-line blocks
 *   (Wood Grain WPC / Slatted WPC + PVC / Aluminum × 6′ / 7′, all `=length/6.0833`),
 *   the per-family simple gate (< 56″), the gate + adjacent line block (56–125″, F124–147)
 *   and the double gate block (106–202″, F151–172).
 *
 * `Vertical Material Calculator - ` — 6′4″ PVC fence line (8′ post spacing),
 *   single gate (< 56″) and double gate (max 96″).
 *
 * Every function mirrors one Excel block; row labels match the sheet text.
 */

import { excelCeiling, excelIfHPostTypeAdjustLongScrew, excelRound, excelRoundUp } from '@/lib/fms-excel-math';

export interface FmsHybridItemRow {
  item: string;
  final: number;
}

/** Sum row groups by item label (case-insensitive; Excel mixes `Cap (H Post)` / `Cap (H post)`). */
export function sumFmsHybridRows(groups: FmsHybridItemRow[][]): FmsHybridItemRow[] {
  const order: string[] = [];
  const byKey = new Map<string, FmsHybridItemRow>();
  for (const rows of groups) {
    for (const r of rows) {
      const key = r.item.trim().toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.final += r.final;
      } else {
        byKey.set(key, { item: r.item.trim(), final: r.final });
        order.push(key);
      }
    }
  }
  return order.map((k) => byKey.get(k)!).filter((r) => r.final !== 0);
}

/* ------------------------------------------------------------------ */
/* Hybrid - Master Material List (SKU mapping)                         */
/* ------------------------------------------------------------------ */

/**
 * Map summed calculator totals onto the Excel `Hybrid - Master Material List` SKUs.
 *
 * Derived rows from that sheet:
 * - Concrete `=caps*2.5`
 * - Outer + Inner U-Channel — one of each per U-channel termination
 *   (sheet note: "For every uchannel 1 outer & 1 inner Post filler are required")
 * - Rail Screw (1.5" x #10) `=long screws * 2`, Plugs (7/8") `=rail screws`
 * - Gate Screw (1.5") = the gates' medium black screws
 * - U-Channel Screw (3/4") = the 3/4" screws (6 per channel + gate short screws)
 */
export function buildFmsHybridMasterList(
  totals: FmsHybridItemRow[],
  orientation: 'horizontal' | 'vertical'
): FmsHybridItemRow[] {
  const map = new Map<string, number>();
  for (const r of totals) {
    const k = r.item.trim().toLowerCase();
    map.set(k, (map.get(k) ?? 0) + r.final);
  }
  const take = (...keys: string[]) => keys.reduce((a, k) => a + (map.get(k) ?? 0), 0);

  const hPost = take('aluminum h post', 'h post');
  const shortGateHPost = take('short gate h post');
  const cap = take('cap (h post)');
  const rail72 =
    orientation === 'horizontal'
      ? take("6' rail", '6 foot rail/overhead brace')
      : take('6 foot rail/overhead brace');
  const rail96 =
    orientation === 'horizontal'
      ? take('8 foot rail')
      : take("8' rail", '8 foot rail', "8 foot rail (or double 6')");
  const board = take('board', '72" board');
  const boardStiff = take('board stiffener');
  const uChannel = take('u channel');
  const gateSideFrame = take('gate side frame', 'gate side plate');
  const gatePostCap = take('small cap (gate side frame cap)', 'small cap (gate side plate cap)');
  const gateBrace = take('gate cross brace', 'gate cross brace (hybrid/metal)');
  const longScrew = take('long black screw (2.5)');
  const railScrew = longScrew * 2;
  const gateScrew = take('medium black screw (1.5)');
  const uChannelScrew = take('small black screw (3/4)', 'short screw (3/4)');

  const rows: FmsHybridItemRow[] = [
    { item: 'Concrete', final: cap * 2.5 },
    { item: 'Aluminum HPost 120"', final: hPost },
    { item: 'Short Gate H Post', final: shortGateHPost },
    { item: 'Aluminum HPost Cap', final: cap },
    // Cuttable stock is summed fractionally across runs and rounded up once for the job.
    { item: '3" Aluminum Pocket Rail 96"', final: excelRoundUp(rail96, 0) },
    { item: '3" Aluminum Pocket Rail 72"', final: excelRoundUp(rail72, 0) },
    { item: 'Board', final: excelRoundUp(board, 0) },
    { item: 'Board Stiffener', final: excelRound(boardStiff, 0) },
    { item: 'Outer U-Channel', final: uChannel },
    { item: 'Inner U-Channel', final: uChannel },
    { item: 'Aluminum Gate Side Frame', final: gateSideFrame },
    { item: 'Aluminum Gate Post Cap', final: gatePostCap },
    { item: 'Adjustable Aluminum Gate Brace', final: gateBrace },
    { item: 'L-Bracket', final: take('l-bracket') },
    { item: 'Long Black Screw (2.5")', final: longScrew },
    { item: 'Rail Screw (1.5" x #10)', final: railScrew },
    { item: 'Plugs (7/8")', final: railScrew },
    { item: 'Gate Screw (1.5")', final: gateScrew },
    { item: 'U-Channel Screw (3/4")', final: uChannelScrew },
    { item: 'Latch Kit', final: take('latch kit') },
    { item: 'Hinge Kit', final: take('hinge kit') },
    { item: 'Drop Rod + Sleeve', final: take('drop rod + sleeve') },
  ];
  return rows.filter((r) => r.final > 0);
}

/* ------------------------------------------------------------------ */
/* Horizontal Material Calculator                                      */
/* ------------------------------------------------------------------ */

export type FmsHybridHoFamily = 'woodGrain' | 'slatted' | 'aluminum';
export type FmsHybridHoHeight = 6 | 7;

export type FmsHybridHoFamilyGroup = 'wpc' | 'aluminum';

export const FMS_HYBRID_HO_FAMILIES: {
  value: FmsHybridHoFamily;
  label: string;
  group: FmsHybridHoFamilyGroup;
}[] = [
  { value: 'woodGrain', label: 'Wood Grain WPC', group: 'wpc' },
  { value: 'slatted', label: 'Slatted WPC', group: 'wpc' },
  { value: 'aluminum', label: 'Aluminum', group: 'aluminum' },
];

export function fmsHybridHoFamilyLabel(family: FmsHybridHoFamily): string {
  return FMS_HYBRID_HO_FAMILIES.find((f) => f.value === family)?.label ?? family;
}

export type FmsHybridMaterialLine = 'pvc' | 'wpc';

export const FMS_HYBRID_MATERIAL_LINES: { value: FmsHybridMaterialLine; label: string }[] = [
  { value: 'pvc', label: 'PVC boards / panels' },
  { value: 'wpc', label: 'WPC boards / panels' },
];

/** Excel block title, e.g. `Horizontal Hybrid ***Wood Grain WPC*** Calculator 6' Tall (6' post spacing)`. */
export function fmsHybridHoBlockTitle(family: FmsHybridHoFamily, height: FmsHybridHoHeight): string {
  return `Horizontal Hybrid ***${fmsHybridHoFamilyLabel(family)}*** Calculator ${height}' Tall (6' post spacing)`;
}

/** Excel `=C/6.0833` — literal divisor on every horizontal block. */
export const FMS_HYBRID_HO_PANEL_DIVISOR = 6.0833;

/** Horizontal hybrid gate line width bands (Excel gate blocks on the same sheet). */
export const HYBRID_H_GATE_SIMPLE_MAX_IN = 56;
export const HYBRID_H_GATE_ADJACENT_MAX_IN = 125;
export const HYBRID_H_GATE_DOUBLE_MIN_IN = 106;

/**
 * Pick the Excel gate block for a gate line width. Width always wins below 56″ or above 125″;
 * between 106–125″ the user's block choice is respected (both Excel sections overlap there).
 */
export type HybridHGateClassified = {
  gate_width_in: number;
  posts: 0 | 1 | 2;
  adjoining: 0 | 1 | 2;
  block: 'simple' | 'adjacent' | 'double';
};

export interface HybridHGateRowInput {
  width_in: string | number;
  posts?: 0 | 1 | 2;
  adjoining?: 0 | 1 | 2;
}

/**
 * Same short / single / double gate routing as the PVC calculator; maps each opening to the
 * matching hybrid horizontal Excel gate block (material formulas differ, placement rules do not).
 */
export function classifyHybridHGateInputs(
  shortRows: HybridHGateRowInput[],
  singleRows: HybridHGateRowInput[],
  doubleRows: HybridHGateRowInput[]
): HybridHGateClassified[] {
  const out: HybridHGateClassified[] = [];
  const push = (r: HybridHGateRowInput, preferred: 'simple' | 'adjacent' | 'double') => {
    const w = Math.max(0, Number(String(r.width_in).replace(/,/g, '')) || 0);
    if (w <= 0) return;
    const posts = (r.posts ?? 1) as 0 | 1 | 2;
    const adjoining = (r.adjoining ?? 1) as 0 | 1 | 2;
    const block = classifyHybridHorizontalGateKind(w, preferred);
    out.push({ gate_width_in: w, posts, adjoining, block });
  };
  for (const r of shortRows) push(r, 'simple');
  for (const r of singleRows) push(r, 'adjacent');
  for (const r of doubleRows) push(r, 'double');
  return out;
}

export function computeHybridHorizontalGateBlockRows(
  gate: HybridHGateClassified,
  family: FmsHybridHoFamily,
  height: FmsHybridHoHeight
): FmsHybridItemRow[] {
  if (gate.block === 'simple') {
    return computeHybridHorizontalGate({ gate_width_in: gate.gate_width_in, posts: gate.posts }, family, height)
      .rows;
  }
  if (gate.block === 'adjacent') {
    return computeHybridHorizontalAdjacentGate({
      gate_line_width_in: gate.gate_width_in,
      adjoining: gate.adjoining,
    }).rows;
  }
  return computeHybridHorizontalDoubleGate({
    gate_line_width_in: gate.gate_width_in,
    adjoining: (gate.adjoining === 2 ? 1 : gate.adjoining) as 0 | 1,
  }).rows;
}

export function classifyHybridHorizontalGateKind(
  widthIn: number,
  userKind: 'simple' | 'adjacent' | 'double'
): 'simple' | 'adjacent' | 'double' {
  const w = Math.max(0, Number(widthIn) || 0);
  if (w < HYBRID_H_GATE_SIMPLE_MAX_IN) return 'simple';
  if (w > HYBRID_H_GATE_ADJACENT_MAX_IN) return 'double';
  if (w >= HYBRID_H_GATE_DOUBLE_MIN_IN && userKind === 'double') return 'double';
  if (w >= HYBRID_H_GATE_SIMPLE_MAX_IN) return userKind === 'simple' ? 'adjacent' : userKind;
  return 'simple';
}

/** Boards per whole panel (B16 row of each block): WG 12/14, Slatted 11/13, Aluminum 17/19. */
export function fmsHybridHoBoardsPerPanel(family: FmsHybridHoFamily, height: FmsHybridHoHeight): number {
  if (family === 'woodGrain') return height === 6 ? 12 : 14;
  if (family === 'slatted') return height === 6 ? 11 : 13;
  return height === 6 ? 17 : 19;
}

export interface FmsHybridHoFenceInput {
  length_ft: number;
  /** "Fence Terminated with H post" (0, 1 or 2). */
  h_post: 0 | 1 | 2;
  /** "Fence Terminated with U Channel" (0, 1 or 2). */
  u_channel: 0 | 1 | 2;
}

export interface FmsHybridHoFenceResult {
  rows: FmsHybridItemRow[];
  /** Excel C9 `=C/6.0833`. */
  panels_raw: number;
  /** Excel C10 `=CEILING(C9,0.5)`. */
  panels_half: number;
  /** Excel D10 `=ROUNDUP(C10,0)`. */
  panels_whole: number;
  /** Excel C11 `=ROUNDUP(C10,0)` — "Posts" info row. */
  posts: number;
}

export function computeHybridHorizontalFence(
  input: FmsHybridHoFenceInput,
  family: FmsHybridHoFamily,
  height: FmsHybridHoHeight
): FmsHybridHoFenceResult {
  const L = Math.max(0, Number(input.length_ft) || 0);
  const d7 = input.h_post;
  const d8 = input.u_channel;

  const c9 = L > 0 ? L / FMS_HYBRID_HO_PANEL_DIVISOR : 0;
  const c10 = excelCeiling(c9, 0.5);
  const d10 = c10 > 0 ? excelRoundUp(c10, 0) : 0;
  const posts = d10;

  const hPost = Math.max(0, d10 + d7 - 1);
  const rail6 = c10 * 2;
  // Boards are horizontal and cuttable — keep the fractional (half-panel) quantity per run so
  // offcuts can finish another run; the master list rounds up once for the whole job.
  const board = fmsHybridHoBoardsPerPanel(family, height) * c10;
  const c17 = d10 * 4;
  const longScrew = excelIfHPostTypeAdjustLongScrew(c17, d8);
  const smallScrew = d8 * 6;

  return {
    rows: [
      { item: 'Aluminum H Post', final: hPost },
      { item: 'Cap (H Post)', final: hPost },
      { item: "6' Rail", final: rail6 },
      { item: 'Board', final: board },
      { item: 'Long Black Screw (2.5)', final: Math.max(0, longScrew) },
      { item: 'U Channel', final: d8 },
      { item: 'Small Black Screw (3/4)', final: smallScrew },
    ],
    panels_raw: c9,
    panels_half: c10,
    panels_whole: d10,
    posts,
  };
}

export interface FmsHybridHoSimpleGateInput {
  /** "Total Gate Line Width (Inches)" — block covers lines shorter than 56″. */
  gate_width_in: number;
  /** "Post needed, 0, 1 or 2". */
  posts: 0 | 1 | 2;
}

/** Simple gate (< 56″) — board count is the family/height literal, halved when the opening is under 37″. */
export function computeHybridHorizontalGate(
  input: FmsHybridHoSimpleGateInput,
  family: FmsHybridHoFamily,
  height: FmsHybridHoHeight
): { rows: FmsHybridItemRow[] } {
  const w = Math.max(0, Number(input.gate_width_in) || 0);
  const p = input.posts;
  const full = fmsHybridHoBoardsPerPanel(family, height);
  // Excel: `=IF(H7>37,G15,IF(H7<37,G15/2))` — exactly 37″ falls through to half boards.
  const board = excelRoundUp(w > 37 ? full : full / 2, 0);
  return {
    rows: [
      { item: 'Gate Side Frame', final: 2 },
      { item: 'H Post', final: p },
      { item: 'Cap (H post)', final: p },
      { item: 'Small Cap (Gate Side Frame Cap)', final: 2 },
      { item: '6 Foot Rail/Overhead Brace', final: 3 },
      { item: 'Board', final: board },
      { item: 'Long Black Screw (2.5)', final: 2 },
      { item: 'Medium Black screw (1.5)', final: 8 },
      { item: 'Gate Cross Brace', final: 1 },
      { item: 'Latch kit', final: 1 },
      { item: 'Hinge Kit', final: 1 },
    ],
  };
}

export interface FmsHybridHoAdjacentGateInput {
  /** "Total Gate Line Width (Inches)" — block covers 56–125″. */
  gate_line_width_in: number;
  /** "Adjoining Existing fence, Insert 0=yes. 1=no 2= Gate in Middle". */
  adjoining: 0 | 1 | 2;
}

/** Gate + adjacent side panel (Excel F124–147). */
export function computeHybridHorizontalAdjacentGate(input: FmsHybridHoAdjacentGateInput): {
  rows: FmsHybridItemRow[];
  side_panel_in: number;
  gate_door_in: number;
} {
  const h127 = Math.max(0, Number(input.gate_line_width_in) || 0);
  const h128 = input.adjoining;
  const h129 = h127 - 56;
  const h130 = h129 / 12 / 6;
  const h133 = excelRound(h130, 4);
  const g138 = h133 * 2 + 1;
  const h139 = h129 <= 36 ? 2 : 3;
  const h140 = h129 <= 36 ? 12 + 6 : 12 + 12;
  return {
    rows: [
      { item: 'Short Gate H Post', final: 2 },
      { item: 'H Post', final: 2 + h128 },
      { item: 'Cap (H post)', final: 4 + h128 },
      { item: '8 foot Rail', final: g138 },
      { item: '6 Foot Rail/Overhead Brace', final: h139 },
      { item: 'Board', final: h140 },
      { item: 'Short Screw (3/4)', final: 4 },
      { item: 'Long Black Screw (2.5)', final: 12 },
      { item: 'Medium Black screw (1.5)', final: 4 },
      { item: 'Gate Cross Brace', final: 1 },
      { item: 'Latch kit', final: 1 },
      { item: 'Hinge Kit', final: 1 },
      { item: 'L-Bracket', final: 2 },
    ],
    side_panel_in: h129,
    gate_door_in: h127 - h129,
  };
}

export interface FmsHybridHoDoubleGateInput {
  /** "Total Gate Line Width (Inches)" — block covers 106–202″. */
  gate_line_width_in: number;
  /** "Adjoining Existing fence, Insert 0=yes. 1=no". */
  adjoining: 0 | 1;
}

/** Double gate (Excel F151–172). Board row uses the intended `base 14 + 6/12` branch (the sheet cell has a broken reference). */
export function computeHybridHorizontalDoubleGate(input: FmsHybridHoDoubleGateInput): {
  rows: FmsHybridItemRow[];
  side_panel_in: number;
  gate_door_in: number;
} {
  const h154 = Math.max(0, Number(input.gate_line_width_in) || 0);
  const h155 = input.adjoining;
  const h156 = h154 - 106;
  const h157 = h156 / 12 / 8.20833333;
  const h160 = excelRound(h157, 4);
  const h158 = h154 - h156 - 8;
  const g165 = h160 * 2 + 2;
  const h165 = excelRoundUp(g165, 0);
  const h166 = h156 <= 36 ? 2 : 3;
  const h167 = h156 <= 36 ? 14 + 6 : 14 + 12;
  return {
    rows: [
      { item: 'Short Gate H Post', final: 1 + h155 },
      { item: 'H Post', final: 1 + h155 },
      { item: 'Cap (H post)', final: 1 + h155 },
      { item: '8 foot Rail', final: h165 },
      { item: '6 Foot Rail/Overhead Brace', final: h166 },
      { item: 'Board', final: h167 },
      { item: 'Short Screw (3/4)', final: 4 },
      { item: 'Long Black Screw (2.5)', final: 44 },
      { item: 'Gate Cross Brace', final: 2 },
      { item: 'Latch kit', final: 1 },
      { item: 'Hinge Kit', final: 2 },
    ],
    side_panel_in: h156,
    gate_door_in: h158,
  };
}

/* ------------------------------------------------------------------ */
/* Vertical Material Calculator (6'4" panels, 8' post spacing)          */
/* ------------------------------------------------------------------ */

export const FMS_HYBRID_VE_PANEL_DIVISOR = 8;

/** Excel block title — panel profile is PVC; premium jobs use WPC colour sheets (Moonlit, Teak). */
export const FMS_HYBRID_VE_BLOCK_TITLE = `Vertical Hybrid ***PVC*** Calculator 6' 4" Tall (8' post spacing)`;

export interface FmsHybridVeFenceInput {
  length_ft: number;
  /** "Fence Terminated with H post" (0, 1 or 2). */
  h_post: 0 | 1 | 2;
  /** "Fence Terminated with U Channel" (0, 1 or 2). */
  u_channel: 0 | 1 | 2;
}

export interface FmsHybridVeFenceResult {
  rows: FmsHybridItemRow[];
  /** Excel C8 `=C5/8`. */
  panels_raw: number;
  /** Excel C9 `=CEILING(C8,0.5)`. */
  panels_half: number;
  /** Excel D9 `=ROUNDUP(C9,0)`. */
  panels_whole: number;
  /** Excel C10 "Posts" info row. */
  posts: number;
}

export function computeHybridVerticalPvc64Fence(input: FmsHybridVeFenceInput): FmsHybridVeFenceResult {
  const L = Math.max(0, Number(input.length_ft) || 0);
  const d6 = input.h_post;
  const d7 = input.u_channel;

  const c8 = L > 0 ? L / FMS_HYBRID_VE_PANEL_DIVISOR : 0;
  const c9 = excelCeiling(c8, 0.5);
  const d9 = c9 > 0 ? excelRoundUp(c9, 0) : 0;
  const posts = d9;

  const hPost = Math.max(0, d9 + d6 - 1);
  const rail8 = c9 * 2;
  // Excel leaves C15/C16 fractional — keep them fractional per run so cut material is shared
  // across runs; the master list rounds the job total up once.
  const board72 = 16 * c8;
  const boardStiff = excelRound(3 * c8, 0);
  const smallScrew = d7 * 6;
  const c19 = d9 * 4;
  const longScrew = excelIfHPostTypeAdjustLongScrew(c19, d7);

  return {
    rows: [
      { item: 'Aluminum H Post', final: hPost },
      { item: 'Cap (H Post)', final: hPost },
      { item: "8' Rail", final: rail8 },
      { item: '72" Board', final: board72 },
      { item: 'Board Stiffener', final: boardStiff },
      { item: 'Small Black Screw (3/4)', final: smallScrew },
      { item: 'U Channel', final: d7 },
      { item: 'Long Black Screw (2.5)', final: Math.max(0, longScrew) },
    ],
    panels_raw: c8,
    panels_half: c9,
    panels_whole: d9,
    posts,
  };
}

export interface FmsHybridVeGateInput {
  /** "Total Gate Line Width (Inches)" — single < 56″, double max 96″. */
  gate_width_in: number;
  /** "Post needed, 0, 1 or 2". */
  posts: 0 | 1 | 2;
}

/** Single gate (lines shorter than 56″) — Excel F3–F21. */
export function computeHybridVerticalGateSingle(input: FmsHybridVeGateInput): { rows: FmsHybridItemRow[] } {
  const w = Math.max(0, Number(input.gate_width_in) || 0);
  const p = input.posts;
  return {
    rows: [
      { item: 'Gate Side Plate', final: 2 },
      { item: 'H Post', final: p },
      { item: 'Cap (H post)', final: p },
      { item: "8 foot Rail (or double 6')", final: 1 },
      { item: '6 Foot Rail/Overhead Brace', final: 1 },
      { item: 'Board', final: excelRoundUp(w / 6, 0) },
      { item: 'Small Cap (Gate Side Plate Cap)', final: 2 },
      { item: 'Long Black Screw (2.5)', final: 2 },
      { item: 'Medium Black screw (1.5)', final: 8 },
      { item: 'Gate Cross Brace (Hybrid/Metal)', final: 1 },
      { item: 'Latch kit', final: 1 },
      { item: 'Hinge Kit', final: 1 },
    ],
  };
}

/** Double gate (max 96″) — Excel J3–J21. */
export function computeHybridVerticalGateDouble(input: FmsHybridVeGateInput): { rows: FmsHybridItemRow[] } {
  const w = Math.max(0, Number(input.gate_width_in) || 0);
  const p = input.posts;
  return {
    rows: [
      { item: 'Gate Side Plate', final: 4 },
      { item: 'H Post', final: p },
      { item: 'Cap (H post)', final: p },
      { item: '8 foot Rail', final: 3 },
      { item: 'Drop Rod + Sleeve', final: 1 },
      { item: 'Board', final: excelRoundUp(w / 6, 0) },
      { item: 'Small Cap (Gate Side Plate Cap)', final: 4 },
      { item: 'Long Black Screw (2.5)', final: 2 },
      { item: 'Medium Black screw (1.5)', final: 16 },
      { item: 'Gate Cross Brace (Hybrid/Metal)', final: 2 },
      { item: 'Latch kit', final: 1 },
      { item: 'Hinge Kit', final: 2 },
    ],
  };
}

/** Vertical hybrid gate line width bands (Excel single F / double J blocks). */
export const HYBRID_V_GATE_DOUBLE_MAX_IN = 96;

export type HybridVGateClassified = {
  gate_width_in: number;
  posts: 0 | 1 | 2;
  block: 'single' | 'double';
};

/**
 * Same short / single / double gate routing as PVC; vertical sheet has single + double blocks only.
 */
export function classifyHybridVGateInputs(
  shortRows: HybridHGateRowInput[],
  singleRows: HybridHGateRowInput[],
  doubleRows: HybridHGateRowInput[]
): HybridVGateClassified[] {
  const out: HybridVGateClassified[] = [];
  const push = (r: HybridHGateRowInput, preferred: 'single' | 'double') => {
    const w = Math.max(0, Number(String(r.width_in).replace(/,/g, '')) || 0);
    if (w <= 0) return;
    const posts = (r.posts ?? 1) as 0 | 1 | 2;
    const block =
      preferred === 'double' && w <= HYBRID_V_GATE_DOUBLE_MAX_IN && w >= HYBRID_H_GATE_SIMPLE_MAX_IN
        ? 'double'
        : 'single';
    out.push({ gate_width_in: w, posts, block });
  };
  for (const r of shortRows) push(r, 'single');
  for (const r of singleRows) push(r, 'single');
  for (const r of doubleRows) push(r, 'double');
  return out;
}

export function computeHybridVerticalGateBlockRows(gate: HybridVGateClassified): FmsHybridItemRow[] {
  const input = { gate_width_in: gate.gate_width_in, posts: gate.posts };
  return gate.block === 'double'
    ? computeHybridVerticalGateDouble(input).rows
    : computeHybridVerticalGateSingle(input).rows;
}
