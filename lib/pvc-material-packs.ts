/**
 * PVC master-list packaging — how items are sold together:
 *  - Board pack: 16 boards + 3 board stiffeners
 *  - Rail pack: 2 rails + 2 rail stiffeners
 *  - Post pack: 1 H-post + 1 galvanized post
 *  - U-channel: sold in pairs (2 per pack)
 *
 * Display: total qty | packs to grab | loose extras (+N beyond full packs).
 */

export interface PvcPackLine {
  total: number;
  packs: number;
  loose: number;
}

/** Full packs that fit in `total`, remainder is loose singles. */
export function splitIntoPacks(total: number, unitsPerPack: number): PvcPackLine {
  const t = Math.max(0, Number(total) || 0);
  if (unitsPerPack <= 0) return { total: t, packs: 0, loose: t };
  const packs = Math.floor(t / unitsPerPack);
  const loose = t - packs * unitsPerPack;
  return { total: t, packs, loose };
}

/** Primary item (boards / rails) sets pack count; secondary gets `packs × perPack` from each pack. */
export function splitCoupledPack(
  primaryTotal: number,
  secondaryTotal: number,
  primaryPerPack: number,
  secondaryPerPack: number
): { packs: number; primary: PvcPackLine; secondary: PvcPackLine } {
  const primary = splitIntoPacks(primaryTotal, primaryPerPack);
  const secondaryFromPacks = primary.packs * secondaryPerPack;
  const secTotal = Math.max(0, Number(secondaryTotal) || 0);
  const secondaryLoose = Math.max(0, secTotal - secondaryFromPacks);
  return {
    packs: primary.packs,
    primary,
    secondary: { total: secTotal, packs: primary.packs, loose: secondaryLoose },
  };
}

/** 1 H-post + 1 galv per pack — pack count is how many matched pairs you can form. */
export function splitPostGalvPack(hPostTotal: number, galvTotal: number): {
  packs: number;
  hPost: PvcPackLine;
  galv: PvcPackLine;
} {
  const hp = Math.max(0, Math.round(Number(hPostTotal) || 0));
  const g = Math.max(0, Math.round(Number(galvTotal) || 0));
  const packs = Math.min(hp, g);
  return {
    packs,
    hPost: { total: hp, packs, loose: hp - packs },
    galv: { total: g, packs, loose: g - packs },
  };
}

export function formatPacksCell(packs: number): string {
  if (!Number.isFinite(packs) || packs <= 0) return '';
  return String(Math.round(packs));
}

export function formatLooseExtra(loose: number): string {
  if (!Number.isFinite(loose) || loose <= 0) return '';
  const n = Math.round(loose * 1000) / 1000;
  if (Math.abs(n - Math.round(n)) < 1e-9) return `+${Math.round(n)}`;
  return `+${n}`;
}
