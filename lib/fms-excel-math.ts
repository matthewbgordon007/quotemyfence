/**
 * Excel-style helpers for FMS workbook parity (ROUND / ROUNDUP / CEILING / IF chains).
 * ROUND / ROUNDUP match `lib/excel-math.ts` (and Microsoft Excel double-precision behaviour
 * on sampled FMS cells: PVC C8–C9, Chain C11–D11, etc.).
 */

/** Excel `ROUND` — ties (.5) round away from zero; mirrors legacy `excel-math` implementation. */
export function excelRound(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const m = 10 ** digits;
  const x = value * m;
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const f = Math.floor(ax);
  const frac = ax - f;
  const roundedInt = frac < 0.5 ? f : f + 1;
  return (s * roundedInt) / m;
}

/**
 * Excel `ROUNDUP` — away from zero (positive → +∞, negative → −∞).
 * Matches Excel for non-integers; `ROUNDUP(0,0)` is 0.
 */
export function excelRoundUp(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const m = 10 ** digits;
  const x = value * m;
  const eps = 1e-12;
  const r = x > 0 ? Math.ceil(x - eps) : x === 0 ? 0 : Math.floor(x + eps);
  return r / m;
}

/** Excel CEILING / CEILING.MATH-style for n ≥ 0: smallest multiple of `significance` that is ≥ n. */
export function excelCeiling(n: number, significance: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(significance) || significance <= 0) return n >= 0 ? n : 0;
  if (n <= 0) return 0;
  return Math.ceil(n / significance - 1e-12) * significance;
}

/** `=IF(B18=1,C17-2,IF(B18=0,C17,IF(B18=2,C17-4)))` on hybrid horizontal long-screw row. */
export function excelIfHPostTypeAdjustLongScrew(c17: number, b18: 0 | 1 | 2): number {
  if (b18 === 1) return c17 - 2;
  if (b18 === 0) return c17;
  if (b18 === 2) return c17 - 4;
  return c17;
}
