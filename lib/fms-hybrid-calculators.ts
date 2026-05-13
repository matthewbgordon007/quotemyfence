/**
 * Hybrid calculators from `Horizontal Material Calculator ` (6' WPC fence + gate)
 * and `Vertical Material Calculator - ` (6'4" PVC fence + gates).
 * Hybrid master concrete uses cap totals × 2.5 (Hybrid `C5=C7*2.5`).
 */

import { excelCeiling, excelIfHPostTypeAdjustLongScrew, excelRoundUp } from '@/lib/fms-excel-math';

/** Horizontal 6′ WPC — Excel literal divisor from `Horizontal Material Calculator` (=C6/6.0833). */
const PANEL_6 = 6.0833;
const PANEL_8 = 8;

export interface FmsHybridHorizontalFenceInput {
  length_ft: number;
  fence_h_post_type: 0 | 1 | 2;
  fence_u_channel: 0 | 1 | 2;
}

export function computeHybridHorizontalWpc6ftFence(input: FmsHybridHorizontalFenceInput) {
  const L = Math.max(0, Number(input.length_ft) || 0);
  const d7 = input.fence_h_post_type;
  const d8 = input.fence_u_channel;
  const c9 = L / PANEL_6;
  const c10 = excelCeiling(c9, 0.5);
  const d10 = excelRoundUp(c10, 0);
  const c11 = excelRoundUp(c10, 0);
  const d13 = d10 + d7 - 1;
  const d15 = c10 * 1 * 2;
  const d16 = 12 * d10;
  const c17 = d10 * 4;
  const d17 = excelIfHPostTypeAdjustLongScrew(c17, d8);
  return {
    aluminum_h_post: d13,
    cap_h_post: d13,
    rail_6ft: d15,
    board: d16,
    long_black_screw_25: d17,
    u_channel: d8,
    small_black_screw: d8 * 6,
    posts: c11,
  };
}

export interface FmsHybridHorizontalGateInput {
  gate_width_in: number;
  posts: 0 | 1 | 2;
}

export function computeHybridHorizontalWpc6ftGate(input: FmsHybridHorizontalGateInput) {
  const h7 = Math.max(0, Number(input.gate_width_in) || 0);
  const h8 = input.posts;
  const g15 = 12;
  const h15 = h7 > 37 ? g15 : h7 < 37 ? g15 / 2 : g15;
  return {
    gate_side_frame: 2,
    h_post: h8,
    cap_h_post: h8,
    small_cap: 2,
    rail_overhead: 3,
    board: h15,
    long_black_screw: 2,
    medium_black_screw: 8,
    gate_cross_brace: 1,
    latch: 1,
    hinge: 1,
  };
}

export interface FmsHybridVerticalPvcFenceInput {
  length_ft: number;
  fence_h_post_type: 0 | 1 | 2;
  fence_u_channel: 0 | 1 | 2;
}

export function computeHybridVerticalPvc64Fence(input: FmsHybridVerticalPvcFenceInput) {
  const L = Math.max(0, Number(input.length_ft) || 0);
  const d6 = input.fence_h_post_type;
  const d7 = input.fence_u_channel;
  const c8 = L / PANEL_8;
  const c9 = excelCeiling(c8, 0.5);
  const d9 = excelRoundUp(c9, 0);
  const c10 = excelRoundUp(c9, 0);
  const d12 = d9 + d6 - 1;
  const d14 = c9 * 2;
  const d15 = 16 * c8;
  const d16 = excelRoundUp(3 * c8, 1);
  const d17 = d7 * 6;
  const c19 = d9 * 4;
  const d19 = excelIfHPostTypeAdjustLongScrew(c19, d7);
  return {
    aluminum_h_post: d12,
    cap_h_post: d12,
    rail_8ft: d14,
    board_72: d15,
    board_stiffener: d16,
    small_black_screw: d17,
    u_channel: d7,
    long_black_screw_25: d19,
    posts: c10,
  };
}

export interface FmsHybridVerticalGateSingleInput {
  gate_width_in: number;
  posts: 0 | 1 | 2;
}

export function computeHybridVerticalPvc64GateSingle(input: FmsHybridVerticalGateSingleInput) {
  const h6 = Math.max(0, Number(input.gate_width_in) || 0);
  const h7 = input.posts;
  return {
    gate_side_plate: 2,
    h_post: h7,
    cap: h7,
    rail_8ft: 1,
    rail_6ft: 1,
    board: h6 / 6,
    small_cap: 2,
    long_black_screw: 2,
    medium_black_screw: 8,
    gate_cross_brace: 1,
    latch: 1,
    hinge: 1,
  };
}

export interface FmsHybridVerticalGateDoubleInput {
  gate_width_in: number;
  posts: 0 | 1 | 2;
}

export function computeHybridVerticalPvc64GateDouble(input: FmsHybridVerticalGateDoubleInput) {
  const l6 = Math.max(0, Number(input.gate_width_in) || 0);
  const l7 = input.posts;
  return {
    gate_side_plate: 4,
    h_post: l7,
    cap: l7,
    rail_8ft: 3,
    drop_rod_sleeve: 1,
    board: l6 / 6,
    small_cap: 4,
    long_black_screw: 2,
    medium_black_screw: 16,
    gate_cross_brace: 2,
    latch: 1,
    hinge: 2,
  };
}

export interface FmsHybridMasterRow {
  label: string;
  qty: number;
}

/** Mirrors Hybrid master rows B6–B21 using fence+gate cap row ×2.5 for concrete (C5=C7*2.5). */
export function combineHybridMasterPreview(args: {
  horizontalFence: ReturnType<typeof computeHybridHorizontalWpc6ftFence>;
  horizontalGate: ReturnType<typeof computeHybridHorizontalWpc6ftGate> | null;
  verticalFence: ReturnType<typeof computeHybridVerticalPvc64Fence>;
  verticalGateSingle: ReturnType<typeof computeHybridVerticalPvc64GateSingle> | null;
  verticalGateDouble: ReturnType<typeof computeHybridVerticalPvc64GateDouble> | null;
}): FmsHybridMasterRow[] {
  const hCap =
    args.horizontalFence.cap_h_post +
    (args.horizontalGate?.cap_h_post ?? 0) +
    args.verticalFence.cap_h_post +
    (args.verticalGateSingle?.cap ?? 0) +
    (args.verticalGateDouble?.cap ?? 0);
  const concrete = hCap * 2.5;

  const hAlu =
    args.horizontalFence.aluminum_h_post +
    (args.horizontalGate?.h_post ?? 0) +
    args.verticalFence.aluminum_h_post +
    (args.verticalGateSingle?.h_post ?? 0) +
    (args.verticalGateDouble?.h_post ?? 0);

  const hAluCap =
    args.horizontalFence.cap_h_post +
    (args.horizontalGate?.cap_h_post ?? 0) +
    args.verticalFence.cap_h_post +
    (args.verticalGateSingle?.cap ?? 0) +
    (args.verticalGateDouble?.cap ?? 0);

  const pocket72 =
    args.horizontalFence.rail_6ft +
    (args.horizontalGate?.rail_overhead ?? 0) +
    args.verticalFence.rail_8ft +
    (args.verticalGateSingle?.rail_8ft ?? 0) +
    (args.verticalGateDouble?.rail_8ft ?? 0);

  const board =
    args.horizontalFence.board +
    (args.horizontalGate?.board ?? 0) +
    args.verticalFence.board_72 +
    (args.verticalGateSingle?.board ?? 0) +
    (args.verticalGateDouble?.board ?? 0);

  const longScr =
    args.horizontalFence.long_black_screw_25 +
    (args.horizontalGate?.long_black_screw ?? 0) +
    args.verticalFence.long_black_screw_25 +
    (args.verticalGateSingle?.long_black_screw ?? 0) +
    (args.verticalGateDouble?.long_black_screw ?? 0);

  const outerU = args.horizontalFence.u_channel;
  const innerU = outerU;
  const uScr =
    args.horizontalFence.small_black_screw +
    args.verticalFence.small_black_screw +
    (args.verticalGateDouble ? 16 : 8);

  return [
    { label: 'Concrete', qty: concrete },
    { label: 'Aluminum HPost 120"', qty: hAlu },
    { label: 'Aluminum HPost Cap', qty: hAluCap },
    { label: '3" Aluminum Pocket Rail 72" / pocket rail mix', qty: pocket72 },
    { label: 'Board', qty: board },
    { label: 'Outer U-Channel', qty: outerU },
    { label: 'Inner U-Channel', qty: innerU },
    { label: 'Long Black Screw (2.5")', qty: longScr },
    { label: 'Rail Screw / U-channel screw (combined preview)', qty: longScr * 2 },
    { label: 'Plugs (7/8")', qty: longScr * 2 },
    { label: 'Gate Screw (1.5")', qty: args.verticalFence.u_channel * 6 },
    { label: 'U-Channel Screw (3/4")', qty: uScr },
    { label: 'Aluminum Gate Side Frame', qty: (args.horizontalGate?.gate_side_frame ?? 0) + (args.verticalGateSingle ? 2 : 0) },
    { label: 'Aluminum Gate Post Cap', qty: (args.horizontalGate?.small_cap ?? 0) + (args.verticalGateSingle?.small_cap ?? 0) },
    { label: 'Adjustable Aluminum Gate Brace', qty: (args.horizontalGate?.gate_cross_brace ?? 0) + (args.verticalGateDouble?.gate_cross_brace ?? 0) },
    { label: 'Latch kit', qty: (args.horizontalGate?.latch ?? 0) + (args.verticalGateSingle?.latch ?? 0) },
    { label: 'Hinge Kit', qty: (args.horizontalGate?.hinge ?? 0) + (args.verticalGateSingle?.hinge ?? 0) + (args.verticalGateDouble?.hinge ?? 0) },
  ];
}
