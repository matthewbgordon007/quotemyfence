/**
 * Material Calculator - PVC (workbook `Material Calculator - PVC` tab).
 * Cell references mirror the sheet (C5 length ft, D6 H post terminations, D7 U channel type 0–2, C27 gate width in, C28 gate posts).
 */

import { excelCeiling, excelRound, excelRoundUp } from '@/lib/excel-math';

/** Divisor in C8: `=C5/8.20833333` */
export const FMS_PVC_PANEL_LENGTH_DIVISOR = 8.20833333;

/** Always added to color-line Long Screw and Plug totals so jobs carry spares (not on the raw workbook D20/D21 cells). */
export const FMS_PVC_COLOR_LINE_EXTRA_LONG_SCREWS = 10;
export const FMS_PVC_COLOR_LINE_EXTRA_PLUGS = 10;

export type FmsPvcLineInputs = {
  lengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
};

export type FmsPvcGateInputs = {
  gateLineWidthInches: number;
  gatePostsNeeded: number;
};

export type FmsPvcLineIntermediates = {
  c5: number;
  d6: number;
  d7: number;
  c8: number;
  c9: number;
  d9: number;
  c10: number;
  b22: number;
};

export type FmsPvcMaterialLineRow = { item: string; final: number };

export type FmsPvcGateIntermediates = {
  c27: number;
  c28: number;
  c31: number;
  c32: number;
};

function clampUChannelBranch(n: number): 0 | 1 | 2 {
  if (!Number.isFinite(n)) return 0;
  return Math.min(2, Math.max(0, Math.round(n))) as 0 | 1 | 2;
}

export function fmsPvcLineIntermediates(line: FmsPvcLineInputs): FmsPvcLineIntermediates {
  const c5 = Number(line.lengthFt) || 0;
  const d6 = Math.max(0, Math.round(Number(line.hPostTerminations) || 0));
  const d7 = clampUChannelBranch(line.uChannelTerminations);
  const c8 = c5 > 0 ? c5 / FMS_PVC_PANEL_LENGTH_DIVISOR : 0;
  const c9 = excelRound(c8, 4);
  const d9 = c9 > 0 ? excelRoundUp(c9, 0) : 0;
  const c10 = c9 > 0 ? excelRoundUp(c9, 0) : 0;
  return { c5, d6, d7, c8, c9, d9, c10, b22: d7 };
}

/** D20 / D21 IF branch on U channel (B22 = D7). */
export function fmsPvcLongPlugAdjusted(c20OrC21: number, uBranch: 0 | 1 | 2, isLong: boolean): number {
  const b = uBranch;
  if (isLong) {
    if (b === 1) return c20OrC21 + 6;
    if (b === 0) return c20OrC21;
    return c20OrC21 + 12;
  }
  if (b === 1) return c20OrC21 - 2;
  if (b === 0) return c20OrC21;
  return c20OrC21 - 4;
}

export function fmsPvcColorLineMaterialFinals(line: FmsPvcLineInputs): { rows: FmsPvcMaterialLineRow[]; z: FmsPvcLineIntermediates } {
  const z = fmsPvcLineIntermediates(line);
  const { d9, d6, c9, c8, d7 } = z;
  const b22 = clampUChannelBranch(d7);

  const postBase = d9 + d6 - 1;
  const railFinal = excelRoundUp(c9 * 2, 0);
  const boardFinal = excelRoundUp(c8 * 16, 10);
  const boardStiffFinal = excelRoundUp(c8 * 3, 1);
  const shortScrewFinal = postBase;
  const c20 = d9 * 4;
  const c21 = d9 * 4;
  const longFinal = fmsPvcLongPlugAdjusted(c20, b22, true) + FMS_PVC_COLOR_LINE_EXTRA_LONG_SCREWS;
  const plugFinal = fmsPvcLongPlugAdjusted(c21, b22, false) + FMS_PVC_COLOR_LINE_EXTRA_PLUGS;
  const uChannelFinal = d7;

  const rows: FmsPvcMaterialLineRow[] = [
    { item: 'Galvanized Post', final: postBase },
    { item: 'H Post', final: postBase },
    { item: 'Cap (H Post)', final: postBase },
    { item: 'Rail', final: railFinal },
    { item: 'Rail Stiffener', final: railFinal },
    { item: 'Board', final: boardFinal },
    { item: 'Board Stiffener', final: boardStiffFinal },
    { item: 'Short Screw', final: shortScrewFinal },
    { item: 'Long Screw', final: longFinal },
    { item: 'Plug', final: plugFinal },
    { item: 'U Channel', final: uChannelFinal },
  ];
  return { rows, z };
}

export function fmsPvcGateIntermediates(gate: FmsPvcGateInputs): FmsPvcGateIntermediates {
  const c27 = Math.max(0, Number(gate.gateLineWidthInches) || 0);
  const c28 = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const c31 = c27 - 10.5;
  const c32 = c31 > 0 ? (c31 - 1) / 6 : 0;
  return { c27, c28, c31, c32 };
}

/**
 * Gate block for "Gate Line Calculator in Inches (Lines Shorter Than 59.5 inches)" — finals from column C.
 */
export function fmsPvcGateMaterialFinals(gate: FmsPvcGateInputs): { rows: FmsPvcMaterialLineRow[]; z: FmsPvcGateIntermediates } {
  const z = fmsPvcGateIntermediates(gate);
  const { c28, c32 } = z;

  const c39 = excelRoundUp(1, 0);
  const c41 = excelRoundUp(c32, 0);
  const c42 = excelRoundUp(c32 + 1 + c28, 0);
  const c43 = 10;
  const c44 = excelRoundUp(c32 + 10, 0);

  const rows: FmsPvcMaterialLineRow[] = [
    { item: 'Galvanized Post', final: c28 },
    { item: 'H Post', final: c28 },
    { item: 'Cap (H post)', final: c28 },
    { item: 'Rail', final: c39 },
    { item: 'Rail Stiffener', final: c39 },
    { item: 'Board', final: c41 },
    { item: 'Short Screw', final: c42 },
    { item: 'Long Screw', final: c43 },
    { item: 'Plug', final: c44 },
    { item: 'U Channel', final: 2 },
    { item: 'Gate Cross Brace', final: 1 },
    { item: 'Gate OverHead Brace', final: 0.5 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
  ];
  return { rows, z };
}

/** Concrete on master-style rollups: not on the PVC calc tab; use 2.5 bags per structural post (line + gate) rounded to 1 dp like contractor UI. */
export function fmsPvcConcreteBags(linePostsWithGate: number): number {
  const raw = linePostsWithGate * 2.5;
  return excelRound(raw, 1);
}
