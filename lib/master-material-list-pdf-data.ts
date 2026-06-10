import {
  computePvcMasterColumn,
  type FmsPvcMasterExtras,
} from '@/lib/fms-pvc-breakdown-master';
import { isSmallWare, LARGE_WARE_TITLE, SMALL_WARE_TITLE, splitWare } from '@/lib/material-ware';
import { formatLooseExtra, formatPacksCell } from '@/lib/pvc-material-packs';

export type MasterMaterialListPdfSection =
  | 'structure'
  | 'accessory'
  | 'hardware'
  | 'wareHeader'
  | 'spacer'
  | 'totals'
  | 'taxRow';

/** Divider rows so every master list reads Large ware first, then Small ware. */
export function wareHeaderPdfRow(title: string): MasterMaterialListPdfRow {
  return { label: title, adobe: '', packs: '', extras: '', section: 'wareHeader' };
}

/**
 * Group item rows into Large ware / Small ware (original order kept inside each group),
 * with a divider row above each group.
 */
export function groupPdfRowsByWare(items: MasterMaterialListPdfRow[]): MasterMaterialListPdfRow[] {
  const { large, small } = splitWare(items, (r) => r.label);
  return [wareHeaderPdfRow(LARGE_WARE_TITLE), ...large, wareHeaderPdfRow(SMALL_WARE_TITLE), ...small];
}

export interface MasterMaterialListPdfRow {
  label: string;
  adobe: string;
  packs: string;
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

function itemSection(label: string): MasterMaterialListPdfSection {
  if (label === 'Base Plates' || label === "Lattice (1' x 8')") return 'accessory';
  if (isSmallWare(label)) return 'hardware';
  return 'structure';
}

function masterRowToPdf(r: import('@/lib/fms-pvc-breakdown-master').FmsPvcMasterRow): MasterMaterialListPdfRow | null {
  if (r.header) {
    return { label: r.label, adobe: '', packs: '', extras: '', section: 'wareHeader' };
  }
  if (!r.label) {
    return { label: '', adobe: '', packs: '', extras: '', section: 'spacer' };
  }
  if (r.label === 'Total Linear Ft' || r.label === 'Total Gates') {
    return { label: r.label, adobe: fmtQty(r.qty), packs: '', extras: '', section: 'totals' };
  }
  return {
    label: r.label,
    adobe: fmtQty(r.qty, r.qty === 0),
    packs: formatPacksCell(r.packs ?? 0),
    extras: formatLooseExtra(r.loose ?? 0),
    section: itemSection(r.label),
  };
}

/**
 * Rows for the PVC Master Material List PDF: Material | Total | Packs | Extras (loose).
 */
export function buildMasterMaterialListPdfRows(
  adobe: Record<number, number>,
  extras: FmsPvcMasterExtras,
  gateCount: number,
  totalFenceLinearFt?: number,
  boardsPercent?: number
): MasterMaterialListPdfRow[] {
  const master = computePvcMasterColumn(adobe, extras, gateCount, totalFenceLinearFt, boardsPercent);
  const pdfRows = master.map(masterRowToPdf).filter((r): r is MasterMaterialListPdfRow => r != null);
  pdfRows.push({ label: 'Total B4 Tax', adobe: '', packs: '', extras: '', section: 'taxRow' });
  return pdfRows;
}
