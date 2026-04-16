/**
 * Shared Excel-parity helpers used across Hybrid Ve / Hybrid Ho workbook tabs.
 */

import { excelRound } from '@/lib/excel-math';

export function fmsUChannelBranch(n: number): 0 | 1 | 2 {
  if (!Number.isFinite(n)) return 0;
  return Math.min(2, Math.max(0, Math.round(n))) as 0 | 1 | 2;
}

/** L18 / L44 / H139 — trailing IF branches are dead in the workbook; first three match cached values. */
export function fmsSixFootRailOverheadCount(k: number, sidePanelInches: number): number {
  if (sidePanelInches < 36) return k + 1;
  if (sidePanelInches === 36) return k + 1;
  return k + 2;
}

/** L19 / L45 / H140 — board strips from base constant given side panel length. */
export function fmsBoardStripsFromBase(base: number, sidePanelInches: number): number {
  if (sidePanelInches < 36) return base + 6;
  if (sidePanelInches === 36) return base + 6;
  return base + 12;
}

/** Hybrid Ho line: Long Black Screw Final after U-channel IF (B18 = 0/1/2). */
export function fmsHybridHoLongBlackFromWholePanels(wholePanels: number, uChannel: number): number {
  const c = wholePanels * 4;
  const b = fmsUChannelBranch(uChannel);
  if (b === 1) return c - 2;
  if (b === 0) return c;
  return c - 4;
}

/** Hybrid Ve / PVC-style screw IF on whole-panel base (plus4 / minus1). */
export function fmsHhPvcScrewIf3(c: number, b20: 0 | 1 | 2, plus: 'plus4' | 'minus1'): number {
  if (plus === 'plus4') {
    if (b20 === 1) return c + 4;
    if (b20 === 0) return c;
    return c + 8;
  }
  if (b20 === 1) return c - 1;
  if (b20 === 0) return c;
  return c - 2;
}

export function fmsHhPvcSmallBlackD21(c21: number, b20: 0 | 1 | 2): number {
  if (b20 === 1) return c21 + 4;
  if (b20 === 0) return c21;
  return c21 + 8;
}

/** Double-gate overhead brace row (Hybrid Ho H166): middle branch typo `146+1` → `G166+1`). */
export function fmsHybridHoDoubleGateSixFootOverhead(k: number, sidePanelInches: number): number {
  if (sidePanelInches < 36) return k + 1;
  if (sidePanelInches === 36) return k + 1;
  return k + 2;
}

export const FMS_HYBRID_SIDE_FRACTION_DIVISOR_6 = 6;
export const FMS_HYBRID_SIDE_FRACTION_DIVISOR_8FT = 8.20833333;

export function fmsSideFractionFromInches(sideInches: number, divisorPerFoot: number): number {
  if (!Number.isFinite(sideInches) || divisorPerFoot <= 0) return 0;
  return sideInches / 12 / divisorPerFoot;
}

export function fmsRoundedSideFraction(sideInches: number, divisorPerFoot: number, digits: number): number {
  return excelRound(fmsSideFractionFromInches(sideInches, divisorPerFoot), digits);
}
