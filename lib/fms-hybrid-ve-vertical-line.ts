/**
 * `Material Calculator - Hybrid Ve` — Vertical Hybrid line (cols A–D, rows 57–73).
 * Panel basis: `C57/8`, `ROUND(C60,4)`, `ROUNDUP(C61,0)` like PVC but with an 8 ft panel divisor.
 */

import { excelRound, excelRoundUp } from '@/lib/excel-math';

export const FMS_VERTICAL_HYBRID_PANEL_DIVISOR_FT = 8;

export type FmsVerticalHybridLineInputs = {
  lengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
};

function uBranch(n: number): 0 | 1 | 2 {
  if (!Number.isFinite(n)) return 0;
  return Math.min(2, Math.max(0, Math.round(n))) as 0 | 1 | 2;
}

function vhScrewIf3(c: number, b71: 0 | 1 | 2, mode: 'plus4' | 'minus1'): number {
  if (mode === 'plus4') {
    if (b71 === 1) return c + 4;
    if (b71 === 0) return c;
    return c + 8;
  }
  if (b71 === 1) return c - 1;
  if (b71 === 0) return c;
  return c - 2;
}

function vhSmallBlackD72(c72: number, b71: 0 | 1 | 2): number {
  if (b71 === 1) return c72 + 4;
  if (b71 === 0) return c72;
  return c72 + 8;
}

export function fmsVerticalHybridLineIntermediates(line: FmsVerticalHybridLineInputs) {
  const c57 = Number(line.lengthFt) || 0;
  const d58 = Math.max(0, Math.round(Number(line.hPostTerminations) || 0));
  const d59 = uBranch(line.uChannelTerminations);
  const c60 = c57 > 0 ? c57 / FMS_VERTICAL_HYBRID_PANEL_DIVISOR_FT : 0;
  const c61 = excelRound(c60, 4);
  const d61 = c61 > 0 ? excelRoundUp(c61, 0) : 0;
  return { c57, d58, d59, c60, c61, d61, b71: d59 };
}

export function fmsVerticalHybridColorLineFinals(line: FmsVerticalHybridLineInputs) {
  const z = fmsVerticalHybridLineIntermediates(line);
  const { c60, c61, d61, d58, b71 } = z;
  const post = d61 + d58 - 1;
  const rail8 = excelRoundUp(c61 * 2, 0);
  const board72 = excelRoundUp(c60 * 16, 10);
  const boardStiff = excelRoundUp(c60 * 3, 1);
  const c69 = 4 * d61;
  const d69 = vhScrewIf3(c69, b71, 'plus4');
  const c70 = 2 * d61;
  const d70 = vhScrewIf3(c70, b71, 'minus1');
  const c73 = d61 * 2;
  const d73 = vhScrewIf3(c73, b71, 'minus1');
  const c72 = 0;
  const d72 = vhSmallBlackD72(c72, b71);
  const rows = [
    { item: 'Aluminum H Post', final: post },
    { item: 'Cap (H Post)', final: post },
    { item: "Rail 8'", final: rail8 },
    { item: '72" Board ', final: board72 },
    { item: 'Board Stiffener', final: boardStiff },
    { item: 'Short Screw (3/4)', final: d69 },
    { item: 'L Bracket', final: d70 },
    { item: 'U Channel', final: z.d59 },
    { item: 'Black Small Screw (3/4)', final: d72 },
    { item: 'Long Black Screw (2.5)', final: d73 },
  ];
  return { rows, z };
}
