/**
 * FMS " Material Calculator - Chain li" — primary fence block (rows 10–27, columns C/D)
 * and simple gate block (rows 37–45).
 */

import { excelRound, excelRoundUp } from '@/lib/fms-excel-math';

export interface FmsChainLinkFenceInput {
  length_ft: number;
  /** Excel D6 — terminal post count / type driver. */
  terminal_post_type: number;
  /** Excel D7 — rail length divisor (ft per rail stock), e.g. 10 or 19.33. */
  rail_length_ft: number;
  /** Excel D8 — mesh roll length divisor (ft per roll), e.g. 50 or 49.2. */
  mesh_roll_ft: number;
  /** Excel D9 — ties per bag (e.g. 100). */
  ties_per_bag: number;
}

export interface FmsChainLinkFenceResult {
  /** Excel C11 `=ROUND(C5/8,4)` — "Total Fence Line Panels". */
  total_panels: number;
  /** Excel D11 `=ROUND(C11,0)` — "Total Whole Number of Fence line Panels". */
  whole_panels: number;
  /** Excel C12 `=ROUNDUP(C11,0)` — "Posts" info row. */
  posts: number;
  terminal_post: number;
  line_post: number;
  terminal_post_cap: number;
  line_post_loop_cap: number;
  rail_end: number;
  rail: number;
  center_band: number;
  offset_band: number;
  tension_bar: number;
  mesh: number;
  bottom_wire: number;
  ties: number;
  carriage_bolt_nut: number;
  hog_rings_note: number;
}

export function computeFmsChainLinkFenceLine(input: FmsChainLinkFenceInput): FmsChainLinkFenceResult {
  const L = Math.max(0, Number(input.length_ft) || 0);
  const d6 = Math.max(0, Number(input.terminal_post_type) || 0);
  const d7 = Math.max(0.01, Number(input.rail_length_ft) || 10);
  const d8 = Math.max(0.01, Number(input.mesh_roll_ft) || 50);
  const d9 = Math.max(0.01, Number(input.ties_per_bag) || 100);

  const c10 = L / 8;
  const c11 = excelRound(c10, 4);
  const d11 = excelRound(c11, 0);
  const d12 = excelRoundUp(c11, 0);

  const d14 = d6;
  const d15 = d11 - 1;
  const d16 = d6;
  const d17 = d15;
  const d18 = 2;
  const b19 = L / d7;
  const d19 = excelRoundUp(b19, 0);
  const d20 = 2;
  const d21 = 8;
  const d22 = excelRoundUp(2, 0);
  const b23 = L / d8;
  const d23 = excelRoundUp(b23, 0);
  const d24 = L + 3;
  // Ties and hog rings are sold whole — round the Excel L/2 math up to whole numbers.
  const d25 = excelRoundUp(L / 2 + (d14 + d15) * 4, 0);
  const d26 = d20 + d21;
  const hogRings = excelRoundUp(L / 2, 0);

  return {
    total_panels: c11,
    whole_panels: d11,
    posts: d12,
    terminal_post: d14,
    line_post: d15,
    terminal_post_cap: d16,
    line_post_loop_cap: d17,
    rail_end: d18,
    rail: d19,
    center_band: d20,
    offset_band: d21,
    tension_bar: d22,
    mesh: d23,
    bottom_wire: d24,
    ties: d25,
    carriage_bolt_nut: d26,
    hog_rings_note: hogRings,
  };
}

export interface FmsChainLinkJobAggregate extends FmsChainLinkFenceResult {
  /** Sum of all run lengths — the basis for the rail and mesh counts. */
  total_linear_ft: number;
}

/**
 * Whole-job aggregate: posts, caps, bands, ties, etc. are calculated per line and summed,
 * but rails and mesh rolls are cut from stock across the whole job, so they are computed
 * from the total linear footage (one ROUNDUP for the job instead of one per run).
 */
export function aggregateFmsChainLinkFenceLines(inputs: FmsChainLinkFenceInput[]): FmsChainLinkJobAggregate | null {
  if (!inputs.length) return null;
  const perLine = inputs.map((i) => computeFmsChainLinkFenceLine(i));
  const keys = Object.keys(perLine[0]) as (keyof FmsChainLinkFenceResult)[];
  const sum = {} as Record<keyof FmsChainLinkFenceResult, number>;
  for (const k of keys) {
    sum[k] = perLine.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  }

  const totalFt = inputs.reduce((a, i) => a + Math.max(0, Number(i.length_ft) || 0), 0);
  const railLen = Math.max(0.01, Number(inputs[0].rail_length_ft) || 10);
  const meshLen = Math.max(0.01, Number(inputs[0].mesh_roll_ft) || 50);
  sum.rail = excelRoundUp(totalFt / railLen, 0);
  sum.mesh = excelRoundUp(totalFt / meshLen, 0);

  return { ...sum, total_linear_ft: totalFt };
}

export interface FmsChainLinkGateInput {
  gate_width_in: number;
  posts: 0 | 1 | 2;
  normal_opening_in: number;
}

export function computeFmsChainLinkGate(input: FmsChainLinkGateInput) {
  const w = Math.max(0, Number(input.gate_width_in) || 0);
  const p = input.posts;
  const opening = Math.max(0, Number(input.normal_opening_in) || 45);
  const ext = w >= opening ? 1 : 0;
  return {
    pre_assembled_frame: 1,
    post: p,
    end_post_cap: p,
    gate_extension_kit: ext,
    hardware_kit: 1,
  };
}
