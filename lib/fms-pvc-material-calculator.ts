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

export const FMS_PVC_PANEL_MODULE_LABELS: Record<FmsPvcPanelModule, string> = {
  nominal_7ft: "7 ft panels (8.2' spacing)",
  nominal_6ft: "6 ft panels (6.75' spacing)",
};

/** Panel height presets (spacing is set separately). */
export const FMS_PVC_PANEL_HEIGHT_LABELS: Record<FmsPvcPanelModule, string> = {
  nominal_7ft: '7 ft panels',
  nominal_6ft: '6 ft panels',
};

export function defaultFmsPvcPanelSpacingFt(module: FmsPvcPanelModule): number {
  return FMS_PVC_PANEL_FT[module];
}

export function resolveFmsPvcPanelSpacingFt(input: Pick<FmsPvcFenceLineInput, 'panel_module' | 'panel_spacing_ft'>): number {
  const custom = Number(input.panel_spacing_ft);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return FMS_PVC_PANEL_FT[input.panel_module];
}

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
  /** Post spacing in ft (Excel length ÷ spacing). Overrides the module default when set. */
  panel_spacing_ft?: number;
  /**
   * Dedicated gate sketch segment: count rail + U at gross length; posts/boards/screws/plugs come from the gate block.
   */
  gate_only_fence_line?: boolean;
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
  /** Fractional (pre-ROUNDUP) quantities for cuttable stock — used to share offcuts across runs. */
  rail_raw: number;
  rail_stiffener_raw: number;
  board_raw: number;
  board_stiffener_raw: number;
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
  const panelFt = resolveFmsPvcPanelSpacingFt(raw);

  const c8 = panelFt > 0 ? L / panelFt : 0;
  const c9 = excelRound(c8, 4);
  const d9 = excelRoundUp(c9, 0);
  const c10 = excelRoundUp(c9, 0);

  const d12 = Math.max(0, d9 + d6 - 1);
  const d13 = d12;
  const d14 = d12;

  const c15 = c9 * B.rail;
  const d15 = excelRoundUp(c15, 0);
  const c16 = c15;
  const d16 = excelRoundUp(c16, 0);

  const c17 = c8 * B.board;
  const d17 = excelRoundUp(c17, 0);

  const c18 = c8 * B.board_stiffener;
  const d18 = excelRoundUp(c18, 0);

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
    ...(raw.panel_spacing_ft != null ? { panel_spacing_ft: raw.panel_spacing_ft } : {}),
    ...(raw.gate_only_fence_line ? { gate_only_fence_line: true } : {}),
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
    rail_raw: c15,
    rail_stiffener_raw: c16,
    board_raw: c17,
    board_stiffener_raw: c18,
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
  /** Same as Master `C5`: `=C10*2.5` where `C10` is total H-post (fence + gate + M10). No ROUND in Excel. */
  concrete_bags_est: number;
  sku_rows: { label: string; quantity: number }[];
}

/** Cuttable stock: offcuts from one run can finish another, so round once per job, not per run. */
const PVC_CUT_SHARED: Partial<Record<keyof FmsPvcFenceLineResult, keyof FmsPvcFenceLineResult>> = {
  rail: 'rail_raw',
  rail_stiffener: 'rail_stiffener_raw',
  board: 'board_raw',
  board_stiffener: 'board_stiffener_raw',
};

export function aggregateFmsPvcFenceLines(lines: FmsPvcFenceLineInput[]): FmsPvcJobTotals {
  const results = lines.filter((l) => l.length_ft > 0).map((l) => computeFmsPvcFenceLine(l));
  const sumWhole = results.reduce((a, r) => a + r.total_whole_panels, 0);
  const sumH = results.reduce((a, r) => a + r.h_post, 0);
  const concrete = sumH * 2.5;

  const sku_rows = PVC_SKU_ROWS.map(({ key, label }) => {
    const rawKey = PVC_CUT_SHARED[key];
    if (rawKey) {
      const rawSum = results.reduce((a, r) => a + (Number(r[rawKey]) || 0), 0);
      return { label, quantity: excelRoundUp(rawSum, 0) };
    }
    return {
      label,
      quantity: results.reduce((a, r) => a + (Number(r[key]) || 0), 0),
    };
  });

  return {
    lines: results,
    sum_whole_panels: sumWhole,
    sum_h_post: sumH,
    concrete_bags_est: concrete,
    sku_rows,
  };
}
