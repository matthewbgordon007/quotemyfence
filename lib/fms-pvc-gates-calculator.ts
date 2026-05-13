/**
 * FMS PVC calculator gate blocks (rows 25–53) from `Material Calculator - PVC`.
 * Outputs map Adobe "Material List Breakdown" gate rows 18–33 (J column equivalents).
 */

import { excelRoundUp } from '@/lib/fms-excel-math';

/** Gate block uses the same 7′ nominal divisor literal as the PVC sheet (`/8.20833333`). */
const PANEL_FT = 8.20833333;

export type FmsPvcGatePosts = 0 | 1 | 2;

export interface FmsPvcShortGateInput {
  gate_width_in: number;
  posts: FmsPvcGatePosts;
}

export interface FmsPvcSingleGateInput {
  gate_width_in: number;
  posts: FmsPvcGatePosts;
}

export interface FmsPvcDoubleGateInput {
  gate_width_in: number;
  posts: FmsPvcGatePosts;
}

/** Adobe-style rows 18–33 (1-based row index on colour breakdown sheet). */
export type FmsPvcAdobeGateRow = 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33;

export type FmsPvcAdobeGateMap = Partial<Record<FmsPvcAdobeGateRow, number>>;

function mergeGateMaps(maps: FmsPvcAdobeGateMap[]): FmsPvcAdobeGateMap {
  const out: FmsPvcAdobeGateMap = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      const row = Number(k) as FmsPvcAdobeGateRow;
      if (!Number.isFinite(v)) continue;
      out[row] = (out[row] ?? 0) + (v as number);
    }
  }
  return out;
}

/** Short gate (< 59.5") — columns B/C on PVC sheet. */
export function computeFmsPvcShortGate(input: FmsPvcShortGateInput): {
  adobe_gate_rows: FmsPvcAdobeGateMap;
  j17_linear_piece: number;
} {
  const w = Math.max(0, Number(input.gate_width_in) || 0);
  const p = input.posts;
  const c32 = w - 10.5;
  const c33 = (c32 - 1) / 6;

  const adobe: FmsPvcAdobeGateMap = {
    18: p,
    19: p,
    20: p,
    21: excelRoundUp(1, 0),
    22: excelRoundUp(1, 0),
    23: excelRoundUp(c33, 0),
    24: 1,
    25: excelRoundUp(c33 + 1 + p * 2, 0),
    26: 10,
    27: excelRoundUp(c33 + 10, 0),
    28: 2,
    29: 1,
    30: 0.5,
    31: 1,
    32: 1,
    33: 1,
  };

  return { adobe_gate_rows: adobe, j17_linear_piece: w / 12 };
}

/** Single gate (min 65.5") — columns G/H. */
export function computeFmsPvcSingleGate(input: FmsPvcSingleGateInput): {
  adobe_gate_rows: FmsPvcAdobeGateMap;
  j17_linear_piece: number;
} {
  const h28 = Math.max(0, Number(input.gate_width_in) || 0);
  const h29 = input.posts;
  const h30 = h28 - 56.5;
  const h31 = h30 / 12 / PANEL_FT;
  const h32 = h28 - h30 - 8;
  const h33 = (h32 - 1) / 6;
  const h34 = h30 / 6;
  const h35 = excelRoundUp(h31, 0);
  const h38 = h29 + h35;

  const g40 = h31 * 2 + 1;
  const h40 = excelRoundUp(g40, 0);
  const g42 = h33 + h34;
  const h42 = excelRoundUp(g42, 0);
  const g43 = 3;
  const h43 = g43 * h35 + 1;
  const g44 = h33 + h29 * 2;
  const h44 = excelRoundUp(g44, 0);
  const g45 = 10 + h38 + h35 * 4;
  const h45 = g45;
  const g46 = h33 + (h45 - h38) + 1;
  const h46 = excelRoundUp(g46, 0);

  const adobe: FmsPvcAdobeGateMap = {
    18: h38,
    19: h38,
    20: h38,
    21: h40,
    22: h40,
    23: h42,
    24: h43,
    25: h44,
    26: h45,
    27: h46,
    28: 2,
    29: 1,
    30: 0.5,
    31: 1,
    32: 1,
    33: 1,
  };

  return { adobe_gate_rows: adobe, j17_linear_piece: h28 / 12 };
}

/** Double gate (min 106") — columns K/L. */
export function computeFmsPvcDoubleGate(input: FmsPvcDoubleGateInput): {
  adobe_gate_rows: FmsPvcAdobeGateMap;
  j17_linear_piece: number;
} {
  const l28 = Math.max(0, Number(input.gate_width_in) || 0);
  const l29 = input.posts;
  const l30 = l28 - 106;
  const l31 = l30 / 12 / PANEL_FT;
  const l32 = l28 - l30 - 8;
  const l33 = (l32 - 1) / 6;
  const l34 = l30 / 6;
  const l35 = excelRoundUp(l31, 0);
  const l38 = l29 + l35;

  const k40 = l31 * 2 + 2;
  const l40 = excelRoundUp(k40, 0);
  const k42 = l33 + l34;
  const l42 = excelRoundUp(k42, 0);
  const k43 = 3;
  const l43 = k43 * l35 + 2;
  const k44 = l33 + l29 * 2;
  const l44 = excelRoundUp(k44, 0);
  const k45 = 18 + l38 + l35 * 4;
  const l45 = k45;
  const k46 = l33 + (l45 - l38) + 1;
  const l46 = excelRoundUp(k46, 0);

  const adobe: FmsPvcAdobeGateMap = {
    18: l38,
    19: l38,
    20: l38,
    21: l40,
    22: l40,
    23: l42,
    24: l43,
    25: l44,
    26: l45,
    27: l46,
    28: 4,
    29: 2,
    30: 1,
    31: 1,
    32: 2,
    33: 2,
  };

  return { adobe_gate_rows: adobe, j17_linear_piece: l28 / 12 };
}

export function sumGateAdobeRows(
  shortGates: FmsPvcShortGateInput[],
  singleGates: FmsPvcSingleGateInput[],
  doubleGates: FmsPvcDoubleGateInput[]
): { merged: FmsPvcAdobeGateMap; j17_total: number } {
  const parts: FmsPvcAdobeGateMap[] = [];
  let widthInSum = 0;
  for (const g of shortGates) {
    const r = computeFmsPvcShortGate(g);
    parts.push(r.adobe_gate_rows);
    widthInSum += Math.max(0, Number(g.gate_width_in) || 0);
  }
  for (const g of singleGates) {
    const r = computeFmsPvcSingleGate(g);
    parts.push(r.adobe_gate_rows);
    widthInSum += Math.max(0, Number(g.gate_width_in) || 0);
  }
  for (const g of doubleGates) {
    const r = computeFmsPvcDoubleGate(g);
    parts.push(r.adobe_gate_rows);
    widthInSum += Math.max(0, Number(g.gate_width_in) || 0);
  }
  const j17 = widthInSum > 0 ? widthInSum / 12 : 0;
  return { merged: mergeGateMaps(parts), j17_total: j17 };
}
