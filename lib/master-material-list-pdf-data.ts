import type { FmsPvcMasterExtras } from '@/lib/fms-pvc-breakdown-master';

function j(adobe: Record<number, number>, row: number): number {
  return adobe[row] ?? 0;
}

export type MasterMaterialListPdfSection = 'structure' | 'accessory' | 'hardware' | 'spacer' | 'totals' | 'taxRow';

export interface MasterMaterialListPdfRow {
  label: string;
  adobe: string;
  extras: string;
  section: MasterMaterialListPdfSection;
}

function fmtQty(n: number, blankWhenZero = false): string {
  if (!Number.isFinite(n)) return '';
  if (blankWhenZero && n === 0) return '';
  if (n === 0) return '0';
  const r = Math.round(n * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return String(Math.round(n * 100) / 100);
}

function extrasCell(m: number): string {
  return m > 0 ? fmtQty(m) : '';
}

/**
 * Rows for the Master Material List PDF (FMS layout): Material | Adobe (total) | Extras (column M adders only).
 */
export function buildMasterMaterialListPdfRows(
  adobe: Record<number, number>,
  extras: FmsPvcMasterExtras,
  gateCount: number,
  totalFenceLinearFt?: number
): MasterMaterialListPdfRow[] {
  const e = extras;
  const x = (m?: number) => (m != null && Number.isFinite(m) ? m : 0);

  const hPost = j(adobe, 4) + j(adobe, 19) + x(e.m10);
  const concrete = hPost * 2.5;

  const rail = j(adobe, 6) + j(adobe, 21) + x(e.m6);
  const railStiff = j(adobe, 7) + j(adobe, 22) + x(e.m7);
  const board = j(adobe, 8) + j(adobe, 23) + x(e.m8);
  const boardStiff = j(adobe, 9) + j(adobe, 24) + x(e.m9);
  const uChannel = j(adobe, 13) + j(adobe, 28) + x(e.m12);
  const hPostStiff = j(adobe, 14) + j(adobe, 33) + x(e.m13);
  const overhead = j(adobe, 30) + x(e.m15);
  const diagonal = j(adobe, 29) + x(e.m16);
  const galv = j(adobe, 3) + j(adobe, 18) + x(e.m11);
  const postCap = j(adobe, 5) + j(adobe, 20) + x(e.m19);
  const holePlug = j(adobe, 12) + j(adobe, 27) + 10 + x(e.m20);
  const largeScrew = j(adobe, 10) + j(adobe, 26) + 10 + x(e.m21);
  const shortScrew = j(adobe, 11) + j(adobe, 25) + x(e.m22);
  const latch = j(adobe, 31) + x(e.m23);
  const hinge = j(adobe, 32) + x(e.m24);

  const fenceLinearFt =
    Number.isFinite(totalFenceLinearFt) && (totalFenceLinearFt ?? 0) >= 0
      ? (totalFenceLinearFt as number)
      : j(adobe, 2);
  const totalLinearFt = fenceLinearFt + j(adobe, 17);

  const S = 'structure' as const;
  const G = 'accessory' as const;
  const H = 'hardware' as const;

  return [
    { label: 'Concrete', adobe: fmtQty(concrete), extras: '', section: S },
    { label: 'Rail', adobe: fmtQty(rail), extras: extrasCell(x(e.m6)), section: S },
    { label: 'Rail Stiffener', adobe: fmtQty(railStiff), extras: extrasCell(x(e.m7)), section: S },
    { label: 'Board', adobe: fmtQty(board), extras: extrasCell(x(e.m8)), section: S },
    { label: 'Board Stiffener', adobe: fmtQty(boardStiff), extras: extrasCell(x(e.m9)), section: S },
    { label: 'H-Post', adobe: fmtQty(hPost), extras: extrasCell(x(e.m10)), section: S },
    { label: 'Galvanized Post', adobe: fmtQty(galv), extras: extrasCell(x(e.m11)), section: S },
    { label: 'U-Channel', adobe: fmtQty(uChannel), extras: extrasCell(x(e.m12)), section: S },
    { label: 'H-Post Stiffener', adobe: fmtQty(hPostStiff), extras: extrasCell(x(e.m13)), section: S },
    { label: 'Post Filler', adobe: fmtQty(0, true), extras: '', section: S },
    { label: 'Overhead Brace', adobe: fmtQty(overhead), extras: extrasCell(x(e.m15)), section: S },
    { label: 'Diagonal Brace', adobe: fmtQty(diagonal), extras: extrasCell(x(e.m16)), section: S },
    { label: 'Base Plates', adobe: fmtQty(0, true), extras: '', section: G },
    { label: "Lattice (1' x 8')", adobe: fmtQty(0, true), extras: '', section: G },
    { label: 'Post Cap', adobe: fmtQty(postCap), extras: extrasCell(x(e.m19)), section: H },
    { label: 'Hole Plug', adobe: fmtQty(holePlug), extras: extrasCell(x(e.m20)), section: H },
    { label: 'Large Screw', adobe: fmtQty(largeScrew), extras: extrasCell(x(e.m21)), section: H },
    { label: 'Short Screw', adobe: fmtQty(shortScrew), extras: extrasCell(x(e.m22)), section: H },
    { label: '*PREMIUM*Latch', adobe: fmtQty(latch), extras: extrasCell(x(e.m23)), section: H },
    { label: '*PREMIUM*Hinge', adobe: fmtQty(hinge), extras: extrasCell(x(e.m24)), section: H },
    { label: 'Drop Rod/Sleeve', adobe: fmtQty(0, true), extras: '', section: H },
    { label: '', adobe: '', extras: '', section: 'spacer' },
    { label: 'Total Linear Ft', adobe: fmtQty(totalLinearFt), extras: '', section: 'totals' },
    { label: 'Total Gates', adobe: fmtQty(gateCount), extras: '', section: 'totals' },
    { label: 'Total B4 Tax', adobe: '', extras: '', section: 'taxRow' },
  ];
}
