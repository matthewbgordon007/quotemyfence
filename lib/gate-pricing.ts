/**
 * Double gate price from single gate: (single × 2) − $100
 */
export function doubleGatePriceFromSingle(singleGatePrice: number): number {
  const s = Number(singleGatePrice);
  if (!Number.isFinite(s)) return 0;
  return Math.round((s * 2 - 100) * 100) / 100;
}
