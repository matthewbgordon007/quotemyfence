import { netFenceLengthsFromSketch, type SketchGatePlacement } from '@/lib/layout-sketch-to-pvc-inputs';

export type LayoutDrawingFootage = {
  total_length_ft: number;
  line_lengths_ft: number[];
  gates: { gate_type: string; quantity: number }[];
};

function parseGatePlacements(raw: unknown): SketchGatePlacement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((g) => {
      if (!g || typeof g !== 'object') return null;
      const row = g as Record<string, unknown>;
      const type = row.type === 'double' ? ('double' as const) : ('single' as const);
      const line_index = Math.max(0, Math.floor(Number(row.line_index) || 0));
      const x = Number(row.x);
      const y = Number(row.y);
      const width_in = Number(row.width_in);
      return {
        type,
        line_index,
        ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
        ...(Number.isFinite(width_in) && width_in > 0 ? { width_in } : {}),
      };
    })
    .filter(Boolean) as SketchGatePlacement[];
}

/** Per-line lengths and total from a saved `layout_drawings.drawing_data` payload. */
export function getLayoutDrawingFootage(raw: unknown): LayoutDrawingFootage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const segments = Array.isArray(o.segments)
    ? o.segments.map((s) => ({
        length_ft: Number((s as { length_ft?: number })?.length_ft),
      }))
    : [];
  const gatePlacements = parseGatePlacements(o.gate_placements);

  const line_lengths_ft =
    segments.length > 0
      ? netFenceLengthsFromSketch(segments, gatePlacements)
      : [];

  const sum = line_lengths_ft.reduce((a, b) => a + b, 0);
  const total_length_ft = sum;

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
