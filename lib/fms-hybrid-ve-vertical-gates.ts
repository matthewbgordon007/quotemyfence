/**
 * `Material Calculator - Hybrid Ve` — Vertical Hybrid gate calculators (rows 54–78 area).
 */

import { excelRoundUp } from '@/lib/excel-math';
import { fmsRoundedSideFraction, fmsSideFractionFromInches, FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT } from '@/lib/fms-hybrid-sheet-formulas';

export type FmsVerticalHybridGateSimpleInputs = {
  totalGateLineWidthInches: number;
  gatePostsNeeded: number;
};

export type FmsVerticalHybridGateAdjacentInputs = {
  totalGateLineWidthInches: number;
  gatePostsNeeded: number;
};

export type FmsVerticalHybridGateDoubleInputs = {
  totalGateLineWidthInches: number;
  gatePostsNeeded: number;
};

export function fmsVerticalHybridGateSimpleFinals(gate: FmsVerticalHybridGateSimpleInputs) {
  const h57 = Math.max(0, Number(gate.totalGateLineWidthInches) || 0);
  const h58 = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const h61 = h57 - 10.5;
  const h62 = (h61 - 1) / 6;
  const board = excelRoundUp(h62, 0);
  const rows = [
    { item: 'Medium Black Screw (1.5)', final: 8 },
    { item: 'H Post', final: h58 },
    { item: 'Cap (H post)', final: h58 },
    { item: "8 foot Rail (or double 6')", final: excelRoundUp(1, 0) },
    { item: 'Small Cap (Gate Side Plate Cap)', final: 2 },
    { item: '72 " Board', final: board },
    { item: 'Short Screw (3/4)', final: excelRoundUp(0, 0) },
    { item: 'Long Black Screw (2.5)', final: 2 },
    { item: 'Gate Side Plate', final: 2 },
    { item: 'Gate Cross Brace (Hybrid/Metal)', final: 1 },
    { item: '6 Foot Rail/Overhead Brace', final: 1 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
  ];
  return { rows, z: { h57, h58, h61, h62, board } };
}

export function fmsVerticalHybridGateAdjacentFinals(gate: FmsVerticalHybridGateAdjacentInputs) {
  const l57 = Math.max(0, Number(gate.totalGateLineWidthInches) || 0);
  const l58 = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const l59 = l57 - 56.5;
  const l60 = fmsSideFractionFromInches(l59, FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT);
  const l64 = fmsRoundedSideFraction(l59, FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT, 4);
  const l61 = l57 - l59 - 8;
  const l62 = (l61 - 1) / 6;
  const l63 = l59 / 6;
  const k69 = l64 * 2 + 1;
  const l69 = excelRoundUp(k69, 0);
  const k71 = l62 + l63;
  const l71 = excelRoundUp(k71, 0);
  const k72 = l62 + 1 + l58;
  const l72 = excelRoundUp(k72, 0);
  const l76 = excelRoundUp(0.5, 0);
  const rows = [
    { item: 'Galvanized Post', final: 1 + l58 },
    { item: 'H Post', final: 1 + l58 },
    { item: 'Cap (H post)', final: 1 + l58 },
    { item: 'Rail', final: l69 },
    { item: 'Rail Stiffener', final: l69 },
    { item: 'Board', final: l71 },
    { item: 'Short Screw (3/4)', final: l72 },
    { item: 'Long Black Screw (2.5)', final: 28 },
    { item: 'U Channel', final: 3 },
    { item: 'Gate Cross Brace (Hybrid/Metal)', final: 1 },
    { item: 'Gate OverHead Brace', final: l76 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 1 },
  ];
  return { rows, z: { l57, l58, l59, l60, l61, l62, l63, l64, l69, l71, l72 } };
}

export function fmsVerticalHybridGateDoubleFinals(gate: FmsVerticalHybridGateDoubleInputs) {
  const p57 = Math.max(0, Number(gate.totalGateLineWidthInches) || 0);
  const p58 = Math.max(0, Math.round(Number(gate.gatePostsNeeded) || 0));
  const p59 = p57 - 106;
  const p60 = fmsSideFractionFromInches(p59, FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT);
  const p64 = fmsRoundedSideFraction(p59, FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT, 4);
  const p61 = p57 - p59 - 8;
  const p62 = (p61 - 1) / 6;
  const p63 = p59 / 6;
  const o69 = 3;
  const p69 = excelRoundUp(o69, 0);
  const o71 = p62 + p63;
  const p71 = excelRoundUp(o71, 0);
  const rows = [
    { item: 'H Post', final: p58 },
    { item: 'Cap (H post)', final: p58 },
    { item: "8' Rail", final: p69 },
    { item: 'Small Cap (Gate Side Plate Cap)', final: 4 },
    { item: '72" Board', final: p71 },
    { item: 'Medium Black Screw (1.5)', final: excelRoundUp(16, 0) },
    { item: 'Long Black Screw (2.5)', final: 2 },
    { item: 'Gate Side Plate', final: 4 },
    { item: 'Gate Cross Brace (Hybrid/Metal)', final: 2 },
    { item: 'Drop Rod', final: 1 },
    { item: 'Latch kit', final: 1 },
    { item: 'Hinge Kit', final: 2 },
  ];
  return { rows, z: { p57, p58, p59, p60, p61, p62, p63, p64, p69, p71 } };
}
