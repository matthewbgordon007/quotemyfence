import {
  computePvcMasterColumn,
  type FmsPvcMasterExtras,
} from '@/lib/fms-pvc-breakdown-master';
import type { FmsCalculatorRecipeV1 } from '@/lib/fms-calculator-recipe';
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

function parsePdfQty(s: string): number {
  if (!s || s.trim() === '') return 0;
  const n = parseFloat(s.replace(/^\+/, ''));
  return Number.isFinite(n) ? n : 0;
}

/** True when a material row has a non-zero total, pack count, or loose extra to pick. */
export function pdfRowHasPickQty(r: MasterMaterialListPdfRow): boolean {
  if (r.section !== 'structure' && r.section !== 'accessory' && r.section !== 'hardware') return true;
  const total = parsePdfQty(r.adobe);
  const extras = parsePdfQty(r.extras);
  const packs = parsePdfQty(r.packs);
  return total > 0 || extras > 0 || packs > 0;
}

/** Drop ware section headers that have no item rows beneath them. */
export function stripEmptyWareSectionHeaders(rows: MasterMaterialListPdfRow[]): MasterMaterialListPdfRow[] {
  const out: MasterMaterialListPdfRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.section !== 'wareHeader') {
      out.push(r);
      continue;
    }
    let hasItems = false;
    for (let j = i + 1; j < rows.length; j++) {
      const next = rows[j];
      if (next.section === 'wareHeader' || next.section === 'spacer' || next.section === 'totals') break;
      if (pdfRowHasPickQty(next)) {
        hasItems = true;
        break;
      }
    }
    if (hasItems) out.push(r);
  }
  return out;
}

/** Pick-list PDF rows: only materials with quantity to grab, plus totals/footer rows. */
export function finalizePdfRowsForPicking(rows: MasterMaterialListPdfRow[]): MasterMaterialListPdfRow[] {
  const withoutZeroItems = rows.filter((r) => {
    if (r.section === 'structure' || r.section === 'accessory' || r.section === 'hardware') {
      return pdfRowHasPickQty(r);
    }
    return true;
  });
  return stripEmptyWareSectionHeaders(withoutZeroItems);
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
  if (r.qty <= 0 && (r.packs ?? 0) <= 0 && (r.loose ?? 0) <= 0) return null;
  return {
    label: r.label,
    adobe: fmtQty(r.qty),
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
  boardsPercent?: number,
  recipe?: FmsCalculatorRecipeV1 | null
): MasterMaterialListPdfRow[] {
  const master = computePvcMasterColumn(adobe, extras, gateCount, totalFenceLinearFt, boardsPercent, recipe);
  const pdfRows = master.map(masterRowToPdf).filter((r): r is MasterMaterialListPdfRow => r != null);
  pdfRows.push({ label: 'Total B4 Tax', adobe: '', packs: '', extras: '', section: 'taxRow' });
  return finalizePdfRowsForPicking(pdfRows);
}
