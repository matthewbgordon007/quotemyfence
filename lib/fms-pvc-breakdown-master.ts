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

/** Sum fence lines into Adobe rows 2–14; gates into 17–33; row 17 = SUM(gate widths in) / 12 (no ROUND in Excel). */
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

export interface FmsPvcMasterRow {
  label: string;
  qty: number;
}

export function computePvcMasterColumn(
  adobe: Record<number, number>,
  extras: FmsPvcMasterExtras,
  gateCount: number
): FmsPvcMasterRow[] {
  const e = extras;
  const x = (m?: number) => (m != null && Number.isFinite(m) ? m : 0);

  const hPost = j(adobe, 4) + j(adobe, 19) + x(e.m10);
  const concrete = hPost * 2.5;

  const rail = j(adobe, 6) + j(adobe, 21) + x(e.m6);
  const railStiff = j(adobe, 7) + j(adobe, 22) + x(e.m7);
  const board = j(adobe, 8) + j(adobe, 23) + x(e.m8);
  const boardStiff = j(adobe, 9) + j(adobe, 24) + x(e.m9);
  const uChannel = j(adobe, 13) + j(adobe, 28) + x(e.m12);
  const hPostStiff = j(adobe, 14) + j(adobe, 33) + x(e.m13);
  const overhead = j(adobe, 30) + x(e.m15);
  const diagonal = j(adobe, 29) + x(e.m16);
  const postCap = j(adobe, 5) + j(adobe, 20) + x(e.m19);
  const holePlug = j(adobe, 12) + j(adobe, 27) + 10 + x(e.m20);
  const largeScrew = j(adobe, 10) + j(adobe, 26) + 10 + x(e.m21);
  const shortScrew = j(adobe, 11) + j(adobe, 25) + x(e.m22);
  const latch = j(adobe, 31) + x(e.m23);
  const hinge = j(adobe, 32) + x(e.m24);

  const totalLinearFt = j(adobe, 2) + j(adobe, 17);

  return [
    { label: 'Concrete', qty: concrete },
    { label: 'Rail', qty: rail },
    { label: 'Rail Stiffener', qty: railStiff },
    { label: 'Board', qty: board },
    { label: 'Board Stiffener', qty: boardStiff },
    { label: 'H-Post', qty: hPost },
    { label: 'Galvanized Post', qty: j(adobe, 3) + j(adobe, 18) + x(e.m11) },
    { label: 'U-Channel', qty: uChannel },
    { label: 'H-Post Stiffener', qty: hPostStiff },
    { label: 'Post Filler', qty: 0 },
    { label: 'Overhead Brace', qty: overhead },
    { label: 'Diagonal Brace', qty: diagonal },
    { label: 'Base Plates', qty: 0 },
    { label: "Lattice (1' x 8')", qty: 0 },
    { label: 'Post Cap', qty: postCap },
    { label: 'Hole Plug', qty: holePlug },
    { label: 'Large Screw', qty: largeScrew },
    { label: 'Short Screw', qty: shortScrew },
    { label: '*PREMIUM*Latch', qty: latch },
    { label: '*PREMIUM*Hinge', qty: hinge },
    { label: 'Drop Rod/Sleeve', qty: 0 },
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
