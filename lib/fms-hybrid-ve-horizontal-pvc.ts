/**
 * `Material Calculator - Hybrid Ve` — Horizontal Hybrid ***PVC*** line (cols A–D, rows 5–21)
 * and gate block for “Lines Shorter Than 56 inches” (cols F–H, rows 14–26) with J–L intermediates.
 */

import { excelCeiling, excelRound, excelRoundUp } from '@/lib/excel-math';

export const FMS_HH_PVC_PANEL_DIVISOR = 6.0833;

export type FmsHybridVeHhPvcLineInputs = {
  lengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
};

export type FmsHybridVeHhPvcGateInputs = {
  /** H6 — total gate line width (inches). */
  gateLineWidthInches: number;
  /** H7 — posts needed (0–2). */
  gatePostsNeeded: number;
  /** L6 — gate / layout width used for side-panel math (workbook default can differ from H6). */
  l6Inches: number;
  /** L7 — adjoining fence flag (0 / 1 / 2) from row 7. */
  l7: number;
  /** Line D7 — U channel terminations, forwarded to row 20 `B20` for screw IF rows. */
  lineUChannelD7: number;
};

export type FmsHybridVeHhPvcLineIntermediates = {
  c8: number;
  c9: number;
  d9: number;
  d6: number;
  d7: 0 | 1 | 2;
  b20: 0 | 1 | 2;
};

function uBranch(n: number): 0 | 1 | 2 {
  if (!Number.isFinite(n)) return 0;
  return Math.min(2, Math.max(0, Math.round(n))) as 0 | 1 | 2;
}

function hhScrewIf3(c: number, b20: 0 | 1 | 2, plus: 'plus4' | 'minus1'): number {
  if (plus === 'plus4') {
    if (b20 === 1) return c + 4;
    if (b20 === 0) return c;
    return c + 8;
  }
  if (b20 === 1) return c - 1;
  if (b20 === 0) return c;
  return c - 2;
}

function hhSmallBlackD21(c21: number, b20: 0 | 1 | 2): number {
  if (b20 === 1) return c21 + 4;
  if (b20 === 0) return c21;
  return c21 + 8;
}

/** L18 / L44 — trailing IFs are unreachable in Excel; first three branches match cached workbook values. */
function sixFootRailOverheadCount(k: number, lPanelInches: number): number {
  if (lPanelInches < 36) return k + 1;
  if (lPanelInches === 36) return k + 1;
  return k + 2;
}

/** L19 / L45 — same structure; vertical gate uses +14/+28 in dead branches only (not used when l equals 36). */
function boardStripsFromBase(base: number, lPanelInches: number): number {
  if (lPanelInches < 36) return base + 6;
  if (lPanelInches === 36) return base + 6;
  return base + 12;
}

export function fmsHybridVeHhPvcLineIntermediates(line: FmsHybridVeHhPvcLineInputs): FmsHybridVeHhPvcLineIntermediates {
  const c5 = Number(line.lengthFt) || 0;
  const d6 = Math.max(0, Math.round(Number(line.hPostTerminations) || 0));
  const d7 = uBranch(line.uChannelTerminations);
  const c8 = c5 > 0 ? c5 / FMS_HH_PVC_PANEL_DIVISOR : 0;
  const c9 = excelCeiling(c8, 0.5);
  const d9 = c9 > 0 ? excelRoundUp(c9, 0) : 0;
  return { c8, c9, d9, d6, d7, b20: d7 };
}

export function fmsHybridVeHhPvcColorLineFinals(line: FmsHybridVeHhPvcLineInputs): { rows: { item: string; final: number }[]; z: FmsHybridVeHhPvcLineIntermediates } {
  const z = fmsHybridVeHhPvcLineIntermediates(line);
  const { c8, c9, d9, d6, b20 } = z;
  const post = d9 + d6 - 1;
  const rail = excelRoundUp(c9 * 1 * 2, 0);
  const board = 11 * c9;
  const boardStiff = excelRoundUp(3 * c8, 1);
  const c17 = 4 * d9;
  const d17 = hhScrewIf3(c17, b20, 'plus4');
  const c18 = 2 * d9;
  const d18 = hhScrewIf3(c18, b20, 'minus1');
  const c19 = d9 * 2;
  const d19 = hhScrewIf3(c19, b20, 'minus1');
  const c21 = 0;
  const d21 = hhSmallBlackD21(c21, b20);
  const rows = [
    { item: 'Aluminum H Post', final: post },
    { item: 'Cap (H Post)', final: post },
    { item: 'Rail', final: rail },
    { item: 'Board', final: board },
    { item: 'Board Stiffener ', final: boardStiff },
    { item: 'Short Screw (3/4)', final: d17 },
    { item: 'L Bracket', final: d18 },
    { item: 'Long Black Screw (2.5)', final: d19 },
    { item: 'U Channel', final: z.d7 },
    { item: ' Small Black Screw (3/4)', final: d21 },
  ];
  return { rows, z };
}

export function fmsHybridVeHhPvcGateIntermediates(gate: FmsHybridVeHhPvcGateInputs) {
  const h6 = Math.max(0, Number(gate.gateLineWidthInches) || 0);
  const h7 = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const l6 = Math.max(0, Number(gate.l6Inches) || 0);
  const l7 = Math.min(2, Math.max(0, Math.round(Number(gate.l7) || 0)));
  const l8 = l6 - 56;
  const l9 = (l8 / 12) / 6;
  const l12 = excelRound(l9, 4);
  const k17 = l12 * 2 + 1;
  const k18 = 1;
  const l18 = sixFootRailOverheadCount(k18, l8);
  const k19 = 12;
  const l19 = boardStripsFromBase(k19, l8);
  const h19 = h6 > 37 ? 11 : h6 < 37 ? 11 / 2 : 11;
  return { h6, h7, l6, l7, l8, l9, l12, k17, k18, l18, k19, l19, h19, b20: uBranch(gate.lineUChannelD7) };
}

export function fmsHybridVeHhPvcGateFinals(gate: FmsHybridVeHhPvcGateInputs): { rows: { item: string; final: number }[]; z: ReturnType<typeof fmsHybridVeHhPvcGateIntermediates> } {
  const z = fmsHybridVeHhPvcGateIntermediates(gate);
  const { h7, h19, l18, l19, b20 } = z;
  const rows: { item: string; final: number }[] = [
    { item: 'Short Gate H Post', final: 2 },
    { item: 'H Post', final: h7 },
    { item: 'Cap (H post)', final: h7 },
    { item: "8 foot Rail (or double 6')", final: excelRoundUp(1, 0) },
    { item: '6 Foot Rail/Overhead Brace', final: l18 },
    { item: 'Board', final: h19 },
    { item: 'Short Screw (3/4)', final: 0 },
    { item: 'Long Black Screw (2.5)', final: 2 },
    { item: 'Medium Black screw (1.5)', final: 8 },
    { item: 'Gate Cross Brace (Hybrid/Metal)', final: 1 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
    { item: 'Small Cap (Gate Side Plate Cap)', final: 2 },
  ];
  void l19;
  void b20;
  return { rows, z };
}
