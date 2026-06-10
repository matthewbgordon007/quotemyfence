export type LayoutDrawingFootage = {
  total_length_ft: number;
  line_lengths_ft: number[];
  gates: { gate_type: string; quantity: number }[];
};

/** Per-line lengths and total from a saved `layout_drawings.drawing_data` payload. */
export function getLayoutDrawingFootage(raw: unknown): LayoutDrawingFootage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const line_lengths_ft = Array.isArray(o.segments)
    ? o.segments.map((s) => {
        const n = Number((s as { length_ft?: number })?.length_ft);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      })
    : [];

  const sum = line_lengths_ft.reduce((a, b) => a + b, 0);
  const stored = Number(o.total_length_ft);
  const total_length_ft = Number.isFinite(stored) && stored > 0 ? stored : sum;

  const gates: LayoutDrawingFootage['gates'] = [];
  if (Array.isArray(o.gates)) {
    for (const g of o.gates) {
      const q = g && typeof g === 'object' ? (g as Record<string, unknown>) : {};
      const quantity = Math.max(0, Math.floor(Number(q.quantity) || 0));
      if (quantity <= 0) continue;
      gates.push({
        gate_type: q.type === 'double' ? 'double' : 'single',
        quantity,
      });
    }
  }

  if (total_length_ft <= 0 && line_lengths_ft.every((l) => l <= 0) && gates.length === 0) {
    return null;
  }

  return { total_length_ft, line_lengths_ft, gates };
}

/** Human-readable block for material request notes / supplier email. */
export function formatLayoutFootageSummary(footage: LayoutDrawingFootage): string {
  const lines = footage.line_lengths_ft
    .map((ft, i) => (ft > 0 ? `Line ${i + 1}: ${ft.toFixed(1)} ft` : null))
    .filter(Boolean)
    .join(', ');

  const gateText =
    footage.gates.length > 0
      ? footage.gates.map((g) => `${g.quantity} ${g.gate_type}`).join(', ')
      : '';

  let out = `— Linear footage: ${footage.total_length_ft.toFixed(1)} ft total`;
  if (lines) out += `\n— Lines: ${lines}`;
  if (gateText) out += `\n— Gates: ${gateText}`;
  return out;
}
