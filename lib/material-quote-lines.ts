export type MaterialQuoteLine = {
  description: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  lineTotal?: number;
};

function parseNum(s: string): number | undefined {
  const n = Number(String(s).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : undefined;
}

/** Parse tab- or comma-separated rows pasted from Sheets/Excel (first column = description). */
export function parseMaterialListFromPaste(raw: string): MaterialQuoteLine[] {
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: MaterialQuoteLine[] = [];
  for (const line of lines) {
    const cols = line.includes('\t') ? line.split('\t') : line.split(',');
    const trimmed = cols.map((c) => c.trim());
    const description = trimmed[0] || '';
    if (!description) continue;
    const row: MaterialQuoteLine = { description };
    if (trimmed[1]) {
      const q = parseNum(trimmed[1]);
      if (q !== undefined) row.qty = q;
      else row.unit = trimmed[1];
    }
    if (trimmed[2]) {
      const p = parseNum(trimmed[2]);
      if (p !== undefined) row.unitPrice = p;
      else if (!row.unit) row.unit = trimmed[2];
    }
    if (trimmed[3]) {
      const t = parseNum(trimmed[3]);
      if (t !== undefined) row.lineTotal = t;
    }
    out.push(row);
  }
  return out;
}

export function normalizeMaterialListJson(value: unknown): MaterialQuoteLine[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const rows: MaterialQuoteLine[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const desc = typeof o.description === 'string' ? o.description.trim() : '';
    if (!desc) continue;
    const row: MaterialQuoteLine = { description: desc };
    if (typeof o.qty === 'number' && Number.isFinite(o.qty)) row.qty = o.qty;
    if (typeof o.unit === 'string' && o.unit.trim()) row.unit = o.unit.trim();
    if (typeof o.unitPrice === 'number' && Number.isFinite(o.unitPrice)) row.unitPrice = o.unitPrice;
    if (typeof o.lineTotal === 'number' && Number.isFinite(o.lineTotal)) row.lineTotal = o.lineTotal;
    rows.push(row);
  }
  return rows;
}

export function materialLinesToTsv(lines: MaterialQuoteLine[]): string {
  return lines
    .map((r) =>
      [r.description, r.qty ?? '', r.unit ?? '', r.unitPrice ?? '', r.lineTotal ?? ''].map((c) => String(c)).join('\t')
    )
    .join('\n');
}
