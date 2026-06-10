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

import { excelCeiling, excelRound, excelRoundUp } from '@/lib/fms-excel-math';

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
/* Horizontal Material Calculator                                      */
/* ------------------------------------------------------------------ */

export type FmsHybridHoFamily = 'woodGrain' | 'slatted' | 'aluminum';
export type FmsHybridHoHeight = 6 | 7;

export const FMS_HYBRID_HO_FAMILIES: { value: FmsHybridHoFamily; label: string }[] = [
  { value: 'woodGrain', label: 'Wood Grain WPC' },
  { value: 'slatted', label: 'Slatted WPC + PVC' },
  { value: 'aluminum', label: 'Aluminum' },
];

export function fmsHybridHoFamilyLabel(family: FmsHybridHoFamily): string {
  return FMS_HYBRID_HO_FAMILIES.find((f) => f.value === family)?.label ?? family;
}

/** Excel block title, e.g. `Horizontal Hybrid ***Wood Grain WPC*** Calculator 6' Tall (6' post spacing)`. */
export function fmsHybridHoBlockTitle(family: FmsHybridHoFamily, height: FmsHybridHoHeight): string {
  return `Horizontal Hybrid ***${fmsHybridHoFamilyLabel(family)}*** Calculator ${height}' Tall (6' post spacing)`;
}

/** Excel `=C/6.0833` — literal divisor on every horizontal block. */
export const FMS_HYBRID_HO_PANEL_DIVISOR = 6.0833;

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
  const board = fmsHybridHoBoardsPerPanel(family, height) * d10;
  const c17 = d10 * 4;
  const longScrew = d8 === 1 ? c17 - 2 : d8 === 0 ? c17 : c17 - 4;
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
  const board = excelRoundUp(w > 37 ? full : w < 37 ? full / 2 : full, 0);
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
/* Vertical Material Calculator (6'4" PVC, 8' post spacing)            */
/* ------------------------------------------------------------------ */

export const FMS_HYBRID_VE_PANEL_DIVISOR = 8;

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
  // Excel leaves C15/C16 fractional; boards and stiffeners are sold whole, so round up.
  const board72 = excelRoundUp(16 * c8, 0);
  const boardStiff = excelRoundUp(3 * c8, 0);
  const smallScrew = d7 * 6;
  const c19 = d9 * 4;
  const longScrew = d7 === 1 ? c19 - 2 : d7 === 0 ? c19 : c19 - 4;

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
