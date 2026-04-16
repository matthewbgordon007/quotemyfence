/**
 * Excel-compatible rounding helpers for FMS workbook parity.
 * Values follow "round half away from zero" for ROUND (Excel 2013+).
 */

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

/** ROUNDUP: away from zero for positive numbers; toward −∞ for negatives (Excel). */
export function excelRoundUp(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const m = 10 ** digits;
  const x = value * m;
  const eps = 1e-12;
  const r = x > 0 ? Math.ceil(x - eps) : Math.floor(x + eps);
  return r / m;
}

/** CEILING(value, significance) for positive value and positive significance (fence math). */
export function excelCeiling(value: number, significance: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(significance) || significance <= 0) return value;
  return Math.ceil(value / significance - 1e-12) * significance;
}
