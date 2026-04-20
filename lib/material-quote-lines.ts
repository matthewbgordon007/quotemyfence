export type MaterialQuoteLine = {
  description: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  lineTotal?: number;
};

/** Collapse NBSP and line breaks inside a pasted table cell into a single-line field for TSV. */
function normalizePastedCellText(raw: string): string {
  return String(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * When the clipboard carries Sheets/Excel HTML, convert the first real grid to TSV.
 * Returns null if there is no parseable table or it does not look like a data grid.
 */
export function tsvFromClipboardHtmlTable(html: string): string | null {
  if (!html || typeof DOMParser === 'undefined') return null;
  if (!/<table[\s>]/i.test(html) && !/<tr[\s>]/i.test(html)) return null;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }

  const table = doc.querySelector('table');
  if (!table) return null;

  const rows: string[][] = [];
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells: string[] = [];
    for (const cell of Array.from(tr.querySelectorAll('th, td'))) {
      const clone = cell.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('br').forEach((br) => br.replaceWith(doc.createTextNode(' ')));
      cells.push(normalizePastedCellText(clone.textContent || ''));
    }
    if (cells.length) rows.push(cells);
  }

  if (!rows.length) return null;
  const maxCols = Math.max(...rows.map((r) => r.length));
  const isGrid = rows.length >= 2 || maxCols >= 2;
  if (!isGrid) return null;

  const lines = rows.map((r) => {
    const padded = [...r];
    while (padded.length < maxCols) padded.push('');
    return padded.join('\t');
  });
  const tsv = lines.join('\n').replace(/\u00a0/g, ' ').trimEnd();
  return tsv.length ? tsv : null;
}

/**
 * Prefer structured TSV from HTML tables (Sheets/Excel); otherwise normalize plain text.
 * Returns null to let the browser handle the paste (e.g. non-text clipboard).
 */
export function normalizeMaterialListClipboardPaste(data: DataTransfer): string | null {
  const plainRaw = data.getData('text/plain');
  const html = data.getData('text/html');

  const plain = plainRaw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trimEnd();

  const fromTable = html ? tsvFromClipboardHtmlTable(html) : null;

  // Sheets often puts a TSV in text/plain; when plain has no tabs, HTML is the reliable grid source.
  if (fromTable && !plain.split('\n').some((line) => line.includes('\t'))) {
    return fromTable;
  }

  if (plain.length) return plain;
  if (fromTable) return fromTable;
  return null;
}

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
