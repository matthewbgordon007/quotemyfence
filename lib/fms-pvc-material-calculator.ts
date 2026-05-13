/**
 * FMS 2026 "Material Calculator - PVC" fence-line block (rows 5–23, columns C/D),
 * transcribed from `docs/2026 FMS - Fencing Material Calculator.xlsx` for numeric parity with Excel.
 */

import { excelRound, excelRoundUp } from '@/lib/fms-excel-math';

export { excelRound, excelRoundUp } from '@/lib/fms-excel-math';

export type FmsPvcPanelModule = 'nominal_7ft' | 'nominal_6ft';

/** Divisors from the workbook — use the same literals as Excel formulas (e.g. `=C5/8.20833333`, `=H5/6.75`). */
export const FMS_PVC_PANEL_FT: Record<FmsPvcPanelModule, number> = {
  nominal_7ft: 8.20833333,
  nominal_6ft: 6.75,
};

/** Per-panel multipliers from column B (Quantity for 1 Panel) on the PVC sheet. */
const B = {
  galvanized: 1,
  h_post: 1,
  cap_h_post: 1,
  rail: 2,
  rail_stiffener: 2,
  board: 16,
  board_stiffener: 3,
  long_screw: 4,
  short_screw: 2,
  plug: 4,
} as const;

export interface FmsPvcFenceLineInput {
  /** Total run length (ft) — Excel `C5` / `H5`. */
  length_ft: number;
  /** Excel `D6` / `I6`: "Fence Terminated with H post" type 0, 1, or 2. */
  fence_terminated_h_post_type: 0 | 1 | 2;
  /** Excel `D7` / `I7`: "Fence Terminated with U Channel" numeric (often 0 or 1). */
  fence_terminated_u_channel: number;
  panel_module: FmsPvcPanelModule;
}

export interface FmsPvcFenceLineResult {
  input: FmsPvcFenceLineInput;
  /** Excel `C8` / `H8` — exact bays before rounding. */
  total_fence_line_panels_raw: number;
  /** Excel `C9` / `H9` — ROUND(raw, 4). */
  total_fence_line_panels_rounded_4: number;
  /** Excel `D9` / `I9` — ROUNDUP(C9, 0). */
  total_whole_panels: number;
  /** Excel `C10` / `H10` — ROUNDUP(C9, 0) labelled "Posts" on sheet. */
  posts: number;
  galvanized_post: number;
  h_post: number;
  cap_h_post: number;
  rail: number;
  rail_stiffener: number;
  board: number;
  board_stiffener: number;
  long_screw: number;
  short_screw: number;
  plug: number;
  u_channel: number;
  h_post_stiffener: number;
}

function clampHType(v: number): 0 | 1 | 2 {
  if (v <= 0) return 0;
  if (v >= 2) return 2;
  return 1 as 0 | 1 | 2;
}

function clampNonNeg(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

/**
 * One fence line — mirrors the left block (`C5`, `D6`, `D7` → `D12`…`D23`) or the right block
 * (`H5`, `I6`, `I7`) using the same formulas with the chosen panel divisor.
 */
export function computeFmsPvcFenceLine(raw: FmsPvcFenceLineInput): FmsPvcFenceLineResult {
  const L = clampNonNeg(raw.length_ft);
  const d6 = clampHType(Math.floor(Number(raw.fence_terminated_h_post_type) || 0)) as 0 | 1 | 2;
  const d7 = clampNonNeg(Number(raw.fence_terminated_u_channel) || 0);
  const panelFt = FMS_PVC_PANEL_FT[raw.panel_module];

  const c8 = panelFt > 0 ? L / panelFt : 0;
  const c9 = excelRound(c8, 4);
  const d9 = excelRoundUp(c9, 0);
  const c10 = excelRoundUp(c9, 0);

  const d12 = d9 + d6 - 1;
  const d13 = d12;
  const d14 = d12;

  const c15 = c9 * B.rail;
  const d15 = excelRoundUp(c15, 0);
  const c16 = c15;
  const d16 = excelRoundUp(c16, 0);

  const c17 = c8 * B.board;
  const d17 = excelRoundUp(c17, 10);

  const c18 = c8 * B.board_stiffener;
  const d18 = excelRoundUp(c18, 1);

  const c19 = d9 * B.long_screw;
  const d19 = c19;

  const c20 = B.short_screw * d12;
  const d20 = c20;

  const c21 = d9 * B.plug;
  const d21 = c21;

  const b22 = d7;
  const d22 = b22;

  const b23 = b22;
  const d23 = b23;

  const input: FmsPvcFenceLineInput = {
    length_ft: L,
    fence_terminated_h_post_type: d6,
    fence_terminated_u_channel: d7,
    panel_module: raw.panel_module,
  };

  return {
    input,
    total_fence_line_panels_raw: c8,
    total_fence_line_panels_rounded_4: c9,
    total_whole_panels: d9,
    posts: c10,
    galvanized_post: d12,
    h_post: d13,
    cap_h_post: d14,
    rail: d15,
    rail_stiffener: d16,
    board: d17,
    board_stiffener: d18,
    long_screw: d19,
    short_screw: d20,
    plug: d21,
    u_channel: d22,
    h_post_stiffener: d23,
  };
}

const PVC_SKU_ROWS: { key: keyof Omit<FmsPvcFenceLineResult, 'input' | 'total_fence_line_panels_raw' | 'total_fence_line_panels_rounded_4' | 'total_whole_panels' | 'posts'>; label: string }[] = [
  { key: 'galvanized_post', label: 'Galvanized Post' },
  { key: 'h_post', label: 'H Post' },
  { key: 'cap_h_post', label: 'Cap (H Post)' },
  { key: 'rail', label: 'Rail' },
  { key: 'rail_stiffener', label: 'Rail Stiffener' },
  { key: 'board', label: 'Board' },
  { key: 'board_stiffener', label: 'Board Stiffener' },
  { key: 'long_screw', label: 'Long Screw' },
  { key: 'short_screw', label: 'Short Screw' },
  { key: 'plug', label: 'Plug' },
  { key: 'u_channel', label: 'U Channel' },
  { key: 'h_post_stiffener', label: 'H Post Stiffener' },
];

export interface FmsPvcJobTotals {
  lines: FmsPvcFenceLineResult[];
  /** Sum of whole panels (`D9`) — used like Excel row "Panels" inputs on colour sheets. */
  sum_whole_panels: number;
  /** Sum of H posts — Master sheet concrete row uses H-post totals × 2.5. */
  sum_h_post: number;
  /** Concrete factor from Master list row B5: `C10*2.5` style (here: 2.5 × total H posts). */
  concrete_bags_est: number;
  sku_rows: { label: string; quantity: number }[];
}

export function aggregateFmsPvcFenceLines(lines: FmsPvcFenceLineInput[]): FmsPvcJobTotals {
  const results = lines.filter((l) => l.length_ft > 0).map((l) => computeFmsPvcFenceLine(l));
  const sumWhole = results.reduce((a, r) => a + r.total_whole_panels, 0);
  const sumH = results.reduce((a, r) => a + r.h_post, 0);
  const concrete = excelRound(sumH * 2.5, 4);

  const sku_rows = PVC_SKU_ROWS.map(({ key, label }) => ({
    label,
    quantity: excelRound(
      results.reduce((a, r) => a + (Number(r[key]) || 0), 0),
      4
    ),
  }));

  return {
    lines: results,
    sum_whole_panels: sumWhole,
    sum_h_post: sumH,
    concrete_bags_est: concrete,
    sku_rows,
  };
}
