/**
 * `Material Calculator - Hybrid Ho` — line calculators (Wood Grain / Slatted / Aluminum × 6′ / 7′)
 * plus shared adjacent and double gate blocks (cols F–H, rows 124–172).
 */

import { excelCeiling, excelRound, excelRoundUp } from '@/lib/excel-math';
import {
  fmsBoardStripsFromBase,
  fmsHybridHoDoubleGateSixFootOverhead,
  fmsHybridHoLongBlackFromWholePanels,
  fmsRoundedSideFraction,
  fmsSixFootRailOverheadCount,
  fmsSideFractionFromInches,
  fmsUChannelBranch,
  FMS_HYBRID_SIDE_FRACTION_DIVISOR_6,
  FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT,
} from '@/lib/fms-hybrid-sheet-formulas';

export const FMS_HYBRID_HO_PANEL_DIVISOR = 6.0833;

export type FmsHybridHoFamily = 'woodGrain' | 'slatted' | 'aluminum';
export type FmsHybridHoHeightFt = 6 | 7;

export type FmsHybridHoLineInputs = {
  lengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
};

export type FmsHybridHoSimpleGateInputs = {
  gateWidthInches: number;
  gatePostsNeeded: number;
};

export type FmsHybridHoAdjacentGateInputs = {
  totalGateLineWidthInches: number;
  adjoiningMode: number;
};

export type FmsHybridHoDoubleGateInputs = {
  totalGateLineWidthInches: number;
  adjoiningFence: number;
};

function hoBoardPerWholePanel(family: FmsHybridHoFamily, heightFt: FmsHybridHoHeightFt): number {
  if (family === 'woodGrain') return heightFt === 6 ? 12 : 14;
  if (family === 'slatted') return heightFt === 6 ? 11 : 13;
  return heightFt === 6 ? 17 : 19;
}

function hoSimpleGateBoardFull(family: FmsHybridHoFamily, heightFt: FmsHybridHoHeightFt): number {
  return hoBoardPerWholePanel(family, heightFt);
}

export function fmsHybridHoLineIntermediates(line: FmsHybridHoLineInputs) {
  const cLen = Number(line.lengthFt) || 0;
  const dH = Math.max(0, Math.round(Number(line.hPostTerminations) || 0));
  const dU = fmsUChannelBranch(line.uChannelTerminations);
  const cRaw = cLen > 0 ? cLen / FMS_HYBRID_HO_PANEL_DIVISOR : 0;
  const cCeil = excelCeiling(cRaw, 0.5);
  const dWhole = cCeil > 0 ? excelRoundUp(cCeil, 0) : 0;
  return { cRaw, cCeilHalfPanel: cCeil, dWholePanels: dWhole, dHPost: dH, dUChannel: dU };
}

export function fmsHybridHoLineFinals(
  line: FmsHybridHoLineInputs,
  family: FmsHybridHoFamily,
  heightFt: FmsHybridHoHeightFt,
): { rows: { item: string; final: number }[]; z: ReturnType<typeof fmsHybridHoLineIntermediates> } {
  const z = fmsHybridHoLineIntermediates(line);
  const boardMult = hoBoardPerWholePanel(family, heightFt);
  const { cCeilHalfPanel: c10, dWholePanels: d10, dHPost: d7, dUChannel: d8 } = z;
  const post = d10 + d7 - 1;
  const rail = c10 * 2;
  const board = boardMult * d10;
  const longBlack = fmsHybridHoLongBlackFromWholePanels(d10, d8);
  const smallBlack = d8 * 6;
  const rows = [
    { item: 'Aluminum H Post', final: post },
    { item: 'Cap (H Post)', final: post },
    { item: "6' Rail", final: rail },
    { item: 'Board', final: board },
    { item: 'Long Black Screw (2.5)', final: longBlack },
    { item: 'U Channel', final: d8 },
    { item: ' Small Black Screw (3/4)', final: smallBlack },
  ];
  return { rows, z };
}

/** Slatted / Aluminum simple gate (lines shorter than 56″) — Wood Grain has no gate block on this tab. */
export function fmsHybridHoSimpleGateFinals(
  gate: FmsHybridHoSimpleGateInputs,
  family: 'slatted' | 'aluminum',
  heightFt: FmsHybridHoHeightFt,
): { rows: { item: string; final: number }[]; z: { boardFinal: number } } {
  const w = Math.max(0, Number(gate.gateWidthInches) || 0);
  const posts = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const full = hoSimpleGateBoardFull(family, heightFt);
  const boardFinal = w > 37 ? full : w < 37 ? full / 2 : full;
  const rows = [
    { item: 'Gate Side Frame', final: 2 },
    { item: 'H Post', final: posts },
    { item: 'Cap (H post)', final: posts },
    { item: 'Small Cap (Gate Side Frame Cap)', final: 2 },
    { item: '6 Foot Rail/Overhead Brace', final: 3 },
    { item: 'Board', final: boardFinal },
    { item: 'Long Black Screw (2.5)', final: 2 },
    { item: 'Medium Black screw (1.5)', final: 8 },
    { item: 'Gate Cross Brace', final: 1 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
  ];
  return { rows, z: { boardFinal } };
}

export function fmsHybridHoAdjacentGateIntermediates(gate: FmsHybridHoAdjacentGateInputs) {
  const h127 = Math.max(0, Number(gate.totalGateLineWidthInches) || 0);
  const h128 = Math.min(2, Math.max(0, Math.round(Number(gate.adjoiningMode) || 0)));
  const h129 = h127 - 56;
  const h130 = fmsSideFractionFromInches(h129, FMS_HYBRID_SIDE_FRACTION_DIVISOR_6);
  const h133 = fmsRoundedSideFraction(h129, FMS_HYBRID_SIDE_FRACTION_DIVISOR_6, 4);
  const g138 = h133 * 2 + 1;
  const h139 = fmsSixFootRailOverheadCount(1, h129);
  const h140 = fmsBoardStripsFromBase(12, h129);
  return { h127, h128, h129, h130, h133, g138, h139, h140 };
}

export function fmsHybridHoAdjacentGateFinals(gate: FmsHybridHoAdjacentGateInputs) {
  const z = fmsHybridHoAdjacentGateIntermediates(gate);
  const { h128, h129, h139, h140, g138 } = z;
  const rows = [
    { item: 'Short Gate H Post', final: 2 },
    { item: 'H Post', final: 2 + h128 },
    { item: 'Cap (H post)', final: 4 + h128 },
    { item: '8 foot Rail', final: g138 },
    { item: '6 Foot Rail/Overhead Brace', final: h139 },
    { item: 'Board', final: h140 },
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

export function fmsHybridHoDoubleGateIntermediates(gate: FmsHybridHoDoubleGateInputs) {
  const h154 = Math.max(0, Number(gate.totalGateLineWidthInches) || 0);
  const h155 = Math.min(1, Math.max(0, Math.round(Number(gate.adjoiningFence) || 0)));
  const h156 = h154 - 106;
  const h157 = fmsSideFractionFromInches(h156, FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT);
  const h160 = excelRound(h157, 4);
  const h158 = h154 - h156 - 8;
  const g165 = h160 * 2 + 2;
  const h165 = excelRoundUp(g165, 0);
  const h166 = fmsHybridHoDoubleGateSixFootOverhead(1, h156);
  const h167 = fmsBoardStripsFromBase(14, h156);
  return { h154, h155, h156, h157, h160, h158, h165, h166, h167 };
}

export function fmsHybridHoDoubleGateFinals(gate: FmsHybridHoDoubleGateInputs) {
  const z = fmsHybridHoDoubleGateIntermediates(gate);
  const { h155, h165, h166, h167 } = z;
  const longScrew = 28 + 16;
  const rows = [
    { item: 'Short Gate H Post', final: 1 + h155 },
    { item: 'H Post', final: 1 + h155 },
    { item: 'Cap (H post)', final: 1 + h155 },
    { item: 'Rail', final: h165 },
    { item: '6 Foot Rail/Overhead Brace', final: h166 },
    { item: 'Board', final: h167 },
    { item: 'Short Screw', final: excelRoundUp(4, 0) },
    { item: 'Long Screw', final: longScrew },
    { item: 'Gate Cross Brace', final: 2 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 2 },
  ];
  return { rows, z };
}
