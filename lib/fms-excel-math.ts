/** Excel-style helpers for FMS workbook parity (ROUND / ROUNDUP / CEILING / IF chains). */

export function excelRound(n: number, numDigits: number): number {
  if (!Number.isFinite(n)) return 0;
  const m = 10 ** numDigits;
  const x = n * m;
  const sign = n >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const f = Math.floor(ax);
  const frac = ax - f;
  if (Math.abs(frac - 0.5) < 1e-12) {
    return (sign * (f + 1)) / m;
  }
  return Math.round(x) / m;
}

export function excelRoundUp(n: number, numDigits: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const m = 10 ** numDigits;
  return Math.ceil(n * m - 1e-12) / m;
}

/** Excel CEILING.MATH-style: smallest multiple of `significance` that is >= n (n >= 0). */
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
