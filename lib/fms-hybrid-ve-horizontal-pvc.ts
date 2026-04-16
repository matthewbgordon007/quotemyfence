/**
 * `Material Calculator - Hybrid Ve` — Horizontal Hybrid ***PVC***:
 * - Line (cols A–D): 6′ block rows 5–21, 7′ block rows 28–47
 * - Gate &lt;56″ (cols F–H): 6′ rows 13–26, 7′ rows 39–52
 * - Gate + adjacent (cols J–L): 6′ rows 13–26, 7′ rows 39–52
 * - Double gate (cols N–P): 6′ rows 13–26, 7′ rows 39–52
 */

import { excelCeiling, excelRoundUp } from '@/lib/excel-math';
import {
  fmsBoardStripsFromBase,
  fmsHhPvcSmallBlackD21,
  fmsHhPvcScrewIf3,
  FMS_HYBRID_SIDE_FRACTION_DIVISOR_6,
  fmsRoundedSideFraction,
  fmsSixFootRailOverheadCount,
  fmsSideFractionFromInches,
  fmsUChannelBranch,
} from '@/lib/fms-hybrid-sheet-formulas';

export const FMS_HH_PVC_PANEL_DIVISOR = 6.0833;

export type FmsHybridVePvcHeightFt = 6 | 7;

export type FmsHybridVeHhPvcLineInputs = {
  lengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
};

export type FmsHybridVeHhPvcGateSimpleInputs = {
  gateLineWidthInches: number;
  gatePostsNeeded: number;
};

export type FmsHybridVeHhPvcGateAdjacentInputs = {
  /** J6 / J32 — total gate line width (inches). */
  totalGateLineWidthInches: number;
  /** J7 / J33 — adjoining mode 0 / 1 / 2. */
  adjoiningMode: number;
};

export type FmsHybridVeHhPvcGateDoubleInputs = {
  /** N6 / N32 — total gate line width (inches); used in board IF like `P6` on the sheet. */
  gateLineWidthInches: number;
  /** N7 / N33 — posts needed (0–2). */
  gatePostsNeeded: number;
};

export type FmsHybridVeHhPvcLineIntermediates = {
  /** C8 / C34 — length ÷ 6.0833. */
  c8: number;
  /** C9 / C35 — `CEILING` to 0.5 panel. */
  c9: number;
  /** D9 / D35 — whole panels. */
  d9: number;
  d6: number;
  d7: 0 | 1 | 2;
  /** B20 / B46 — U channel branch forwarded into screw IF rows. */
  b20: 0 | 1 | 2;
};

export function fmsHybridVeHhPvcLineIntermediates(
  line: FmsHybridVeHhPvcLineInputs,
  _pvcHeightFt: FmsHybridVePvcHeightFt,
): FmsHybridVeHhPvcLineIntermediates {
  const length = Number(line.lengthFt) || 0;
  const d6 = Math.max(0, Math.round(Number(line.hPostTerminations) || 0));
  const d7 = fmsUChannelBranch(line.uChannelTerminations);
  const c8 = length > 0 ? length / FMS_HH_PVC_PANEL_DIVISOR : 0;
  const c9 = excelCeiling(c8, 0.5);
  const d9 = c9 > 0 ? excelRoundUp(c9, 0) : 0;
  return { c8, c9, d9, d6, d7, b20: d7 };
}

export function fmsHybridVeHhPvcColorLineFinals(
  line: FmsHybridVeHhPvcLineInputs,
  pvcHeightFt: FmsHybridVePvcHeightFt,
): { rows: { item: string; final: number }[]; z: FmsHybridVeHhPvcLineIntermediates } {
  const z = fmsHybridVeHhPvcLineIntermediates(line, pvcHeightFt);
  const boardPerCeilPanel = pvcHeightFt === 6 ? 11 : 13;
  const { c8, c9, d9, d6, b20 } = z;
  const post = d9 + d6 - 1;
  const rail = excelRoundUp(c9 * 1 * 2, 0);
  const board = boardPerCeilPanel * c9;
  const boardStiff = excelRoundUp(3 * c8, 1);
  const c17 = 4 * d9;
  const d17 = fmsHhPvcScrewIf3(c17, b20, 'plus4');
  const c18 = 2 * d9;
  const d18 = fmsHhPvcScrewIf3(c18, b20, 'minus1');
  const c19 = d9 * 2;
  const d19 = fmsHhPvcScrewIf3(c19, b20, 'minus1');
  const c21 = 0;
  const d21 = fmsHhPvcSmallBlackD21(c21, b20);
  const railLabel = pvcHeightFt === 6 ? 'Rail' : "Rail 6'";
  const rows = [
    { item: 'Aluminum H Post', final: post },
    { item: 'Cap (H Post)', final: post },
    { item: railLabel, final: rail },
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

export function fmsHybridVeHhPvcGateSimpleFinals(
  gate: FmsHybridVeHhPvcGateSimpleInputs,
  pvcHeightFt: FmsHybridVePvcHeightFt,
): { rows: { item: string; final: number }[]; z: { hWidth: number; hPosts: number; boardFinal: number } } {
  const hWidth = Math.max(0, Number(gate.gateLineWidthInches) || 0);
  const hPosts = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const gBoard = pvcHeightFt === 6 ? 11 : 13;
  const boardFinal = hWidth > 37 ? gBoard : hWidth < 37 ? gBoard / 2 : gBoard;
  const rows: { item: string; final: number }[] = [
    { item: 'Gate Side Plate', final: 2 },
    { item: 'H Post', final: hPosts },
    { item: 'Cap (H post)', final: hPosts },
    { item: "8 foot Rail (or double 6')", final: excelRoundUp(1, 0) },
    { item: '6 Foot Rail/Overhead Brace', final: 1 },
    { item: 'Board', final: boardFinal },
    { item: 'Short Screw (3/4)', final: 0 },
    { item: 'Long Black Screw (2.5)', final: 2 },
    { item: 'Medium Black screw (1.5)', final: 8 },
    { item: 'Gate Cross Brace (Hybrid/Metal)', final: 1 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
    { item: 'Small Cap (Gate Side Plate Cap)', final: 2 },
  ];
  return { rows, z: { hWidth, hPosts, boardFinal } };
}

export function fmsHybridVeHhPvcGateAdjacentIntermediates(
  gate: FmsHybridVeHhPvcGateAdjacentInputs,
  pvcHeightFt: FmsHybridVePvcHeightFt,
) {
  const l6 = Math.max(0, Number(gate.totalGateLineWidthInches) || 0);
  const l7 = Math.min(2, Math.max(0, Math.round(Number(gate.adjoiningMode) || 0)));
  const l8 = l6 - 56;
  const l9 = fmsSideFractionFromInches(l8, FMS_HYBRID_SIDE_FRACTION_DIVISOR_6);
  const l12 = fmsRoundedSideFraction(l8, FMS_HYBRID_SIDE_FRACTION_DIVISOR_6, 4);
  const k17 = l12 * 2 + 1;
  const k18 = 1;
  const l18 = fmsSixFootRailOverheadCount(k18, l8);
  const boardBase = pvcHeightFt === 6 ? 12 : 14;
  const l19 = fmsBoardStripsFromBase(boardBase, l8);
  return { l6, l7, l8, l9, l12, k17, k18, l18, k19: boardBase, l19 };
}

export function fmsHybridVeHhPvcGateAdjacentFinals(
  gate: FmsHybridVeHhPvcGateAdjacentInputs,
  pvcHeightFt: FmsHybridVePvcHeightFt,
): { rows: { item: string; final: number }[]; z: ReturnType<typeof fmsHybridVeHhPvcGateAdjacentIntermediates> } {
  const z = fmsHybridVeHhPvcGateAdjacentIntermediates(gate, pvcHeightFt);
  const { l7, l18, l19, k17 } = z;
  const rows: { item: string; final: number }[] = [
    { item: 'Short Gate H Post', final: 2 },
    { item: 'H Post', final: 2 + l7 },
    { item: 'Cap (H post)', final: 4 + l7 },
    { item: '8 foot Rail', final: k17 },
    { item: '6 Foot Rail/Overhead Brace', final: l18 },
    { item: 'Board', final: l19 },
    { item: 'Short Screw (3/4)', final: 4 },
    { item: 'Long Black Screw (2.5)', final: 12 },
    { item: 'Medium Black screw (1.5)', final: 4 },
    { item: 'Gate Cross Brace', final: 1 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
    { item: 'L-Bracket', final: 2 },
  ];
  return { rows, z };
}

export function fmsHybridVeHhPvcGateDoubleFinals(
  gate: FmsHybridVeHhPvcGateDoubleInputs,
  pvcHeightFt: FmsHybridVePvcHeightFt,
): { rows: { item: string; final: number }[]; z: { pWidth: number; pPosts: number; boardFinal: number } } {
  const pWidth = Math.max(0, Number(gate.gateLineWidthInches) || 0);
  const pPosts = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const oBase = pvcHeightFt === 6 ? 22 : 26;
  const boardFinal = pWidth > 37 ? oBase : pWidth < 37 ? oBase / 2 : oBase;
  const rows: { item: string; final: number }[] = [
    { item: 'Gate Side Plate', final: 4 },
    { item: 'H Post', final: pPosts },
    { item: 'Cap (H post)', final: pPosts },
    { item: '8 foot Rail ', final: excelRoundUp(3, 0) },
    { item: 'Small Cap (Gate Side Plate Cap)', final: 4 },
    { item: 'Board', final: boardFinal },
    { item: 'Short Screw (3/4)', final: 0 },
    { item: 'Long Black Screw (2.5)', final: 2 },
    { item: 'Medium Black screw (1.5)', final: 16 },
    { item: 'Gate Cross Brace (Hybrid/Metal)', final: 2 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 2 },
    { item: 'Drop Rod', final: 1 },
  ];
  return { rows, z: { pWidth, pPosts, boardFinal } };
}

/** Legacy combined inputs from the first supplier UI pass (adjacent block uses `l6` / `l7`). */
export type FmsHybridVeHhPvcGateInputs = {
  gateLineWidthInches: number;
  gatePostsNeeded: number;
  l6Inches: number;
  l7: number;
  lineUChannelD7: number;
};

/** @deprecated Prefer `fmsHybridVeHhPvcGateAdjacentIntermediates`. */
export function fmsHybridVeHhPvcGateIntermediates(gate: FmsHybridVeHhPvcGateInputs) {
  return fmsHybridVeHhPvcGateAdjacentIntermediates(
    { totalGateLineWidthInches: gate.l6Inches, adjoiningMode: gate.l7 },
    6,
  );
}

/** @deprecated Prefer `fmsHybridVeHhPvcGateAdjacentFinals`. */
export function fmsHybridVeHhPvcGateFinals(gate: FmsHybridVeHhPvcGateInputs): {
  rows: { item: string; final: number }[];
  z: ReturnType<typeof fmsHybridVeHhPvcGateAdjacentIntermediates>;
} {
  void gate.gateLineWidthInches;
  void gate.gatePostsNeeded;
  void gate.lineUChannelD7;
  return fmsHybridVeHhPvcGateAdjacentFinals(
    { totalGateLineWidthInches: gate.l6Inches, adjoiningMode: gate.l7 },
    6,
  );
}
