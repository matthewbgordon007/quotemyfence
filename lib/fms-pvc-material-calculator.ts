/**
 * FMS 2026 "Material Calculator - PVC" fence-line block (rows 5–23, columns C/D),
 * transcribed from `docs/2026 FMS - Fencing Material Calculator.xlsx` for numeric parity with Excel.
 */

import { resolveFmsCalculatorRecipe, type FmsCalculatorRecipeV1 } from '@/lib/fms-calculator-recipe';
import { excelRound, excelRoundUp } from '@/lib/fms-excel-math';

export { excelRound, excelRoundUp } from '@/lib/fms-excel-math';

export type FmsPvcPanelModule = 'nominal_7ft' | 'nominal_6ft';

/** Divisors from the workbook — literals from `Material Calculator - PVC` (`=C5/8.20833333`, `=H5/6`). */
export const FMS_PVC_PANEL_FT: Record<FmsPvcPanelModule, number> = {
  nominal_7ft: 8.20833333,
  nominal_6ft: 6,
};

export const FMS_PVC_PANEL_MODULE_LABELS: Record<FmsPvcPanelModule, string> = {
  nominal_7ft: "7 ft panels (8.2' spacing)",
  nominal_6ft: "6 ft panels (6' spacing)",
};

/** Panel height presets (spacing is set separately). */
export const FMS_PVC_PANEL_HEIGHT_LABELS: Record<FmsPvcPanelModule, string> = {
  nominal_7ft: '7 ft panels',
  nominal_6ft: '6 ft panels',
};

export function defaultFmsPvcPanelSpacingFt(
  module: FmsPvcPanelModule,
  recipe?: FmsCalculatorRecipeV1 | null
): number {
  return resolveFmsCalculatorRecipe(recipe).fence.panel_spacing_ft[module];
}

export function resolveFmsPvcPanelSpacingFt(
  input: Pick<FmsPvcFenceLineInput, 'panel_module' | 'panel_spacing_ft'>,
  recipe?: FmsCalculatorRecipeV1 | null
): number {
  const custom = Number(input.panel_spacing_ft);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return resolveFmsCalculatorRecipe(recipe).fence.panel_spacing_ft[input.panel_module];
}

export interface FmsPvcFenceLineInput {
  length_ft: number;
  fence_terminated_h_post_type: 0 | 1 | 2;
  fence_terminated_u_channel: number;
  panel_module: FmsPvcPanelModule;
  panel_spacing_ft?: number;
}

export interface FmsPvcFenceLineResult {
  input: FmsPvcFenceLineInput;
  total_fence_line_panels_raw: number;
  total_fence_line_panels_rounded_4: number;
  total_whole_panels: number;
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

type FenceSkuKey = keyof Omit<
  FmsPvcFenceLineResult,
  'input' | 'total_fence_line_panels_raw' | 'total_fence_line_panels_rounded_4' | 'total_whole_panels' | 'posts'
>;

const FENCE_SKU_KEYS: FenceSkuKey[] = [
  'galvanized_post',
  'h_post',
  'cap_h_post',
  'rail',
  'rail_stiffener',
  'board',
  'board_stiffener',
  'long_screw',
  'short_screw',
  'plug',
  'u_channel',
  'h_post_stiffener',
];

export function computeFmsPvcFenceLine(
  raw: FmsPvcFenceLineInput,
  recipe?: FmsCalculatorRecipeV1 | null
): FmsPvcFenceLineResult {
  const r = resolveFmsCalculatorRecipe(recipe);
  const B = r.fence.per_panel;
  const L = clampNonNeg(raw.length_ft);
  const d6 = clampHType(Math.floor(Number(raw.fence_terminated_h_post_type) || 0)) as 0 | 1 | 2;
  const d7 = clampNonNeg(Number(raw.fence_terminated_u_channel) || 0);
  const panelFt = resolveFmsPvcPanelSpacingFt(raw, r);
  const is6ft = raw.panel_module === 'nominal_6ft';

  const c8 = panelFt > 0 ? L / panelFt : 0;
  const c9 = excelRound(c8, 4);
  const d9 = c9 > 0 ? excelRoundUp(c9, 0) : 0;
  const c10 = c9 > 0 ? excelRoundUp(c9, 0) : 0;

  const d12 = Math.max(0, d9 + d6 - 1);
  const d13 = d12;
  const d14 = d12;

  const c15 = c9 * B.rail;
  const d15 = excelRoundUp(c15, 0);
  const c16 = c15;
  const d16 = excelRoundUp(c16, 0);

  let c17: number;
  let d17: number;
  let c18: number;
  let d18: number;

  if (is6ft) {
    const g17In = L * 12 - 2 * d12;
    const h17Ft = g17In / 12;
    c17 = h17Ft * r.fence.board_multiplier_6ft;
    d17 = excelRoundUp(c17, 0);
    c18 = c8 * B.board_stiffener;
    d18 = excelRoundUp(c18, 1);
  } else {
    c17 = c8 * B.board;
    d17 = excelRoundUp(c17, 0);
    c18 = c8 * B.board_stiffener;
    d18 = excelRoundUp(c18, 1);
  }

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

  return {
    input: {
      length_ft: L,
      fence_terminated_h_post_type: d6,
      fence_terminated_u_channel: d7,
      panel_module: raw.panel_module,
    },
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

export interface FmsPvcJobTotals {
  lines: FmsPvcFenceLineResult[];
  sum_whole_panels: number;
  sum_h_post: number;
  concrete_bags_est: number;
  sku_rows: { label: string; quantity: number }[];
}

export function aggregateFmsPvcFenceLines(
  lines: FmsPvcFenceLineInput[],
  recipe?: FmsCalculatorRecipeV1 | null
): FmsPvcJobTotals {
  const r = resolveFmsCalculatorRecipe(recipe);
  const results = lines
    .filter(
      (l) =>
        l.length_ft > 0 ||
        l.fence_terminated_h_post_type > 0 ||
        l.fence_terminated_u_channel > 0
    )
    .map((l) => computeFmsPvcFenceLine(l, r));
  const sumWhole = results.reduce((a, line) => a + line.total_whole_panels, 0);
  const sumH = results.reduce((a, line) => a + line.h_post, 0);
  const concrete = sumH * r.concrete_bags_per_h_post;

  const sku_rows = FENCE_SKU_KEYS.map((key) => ({
    label: r.fence_sku_labels[key],
    quantity: results.reduce((a, line) => a + (Number(line[key]) || 0), 0),
  }));

  return {
    lines: results,
    sum_whole_panels: sumWhole,
    sum_h_post: sumH,
    concrete_bags_est: concrete,
    sku_rows,
  };
}
