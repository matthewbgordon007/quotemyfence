import type { LayoutGatePlacement, LineHighlightMode } from '@/components/LayoutDrawCanvas';

export type LayoutDrawingCanvasInitial = NonNullable<
  import('@/components/LayoutDrawCanvas').LayoutDrawCanvasProps['initialDrawing']
>;

/** Parse saved layout_drawings.drawing_data for read-only LayoutDrawCanvas display. */
export function parseSavedLayoutDrawing(raw: unknown): LayoutDrawingCanvasInitial | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const points = Array.isArray(o.points)
    ? o.points
        .filter((p) => p && typeof p === 'object')
        .map((p) => {
          const q = p as Record<string, unknown>;
          return { x: Number(q.x) || 0, y: Number(q.y) || 0 };
        })
    : [];
  const segments = Array.isArray(o.segments)
    ? o.segments.map((s) => {
        const q = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
        const n = Number(q.length_ft);
        return { length_ft: Number.isFinite(n) && n >= 0 ? n : 0 };
      })
    : [];
  if (points.length < 2 && segments.length === 0) return null;

  const gates = Array.isArray(o.gates)
    ? o.gates
        .map((g) => {
          const q = g && typeof g === 'object' ? (g as Record<string, unknown>) : {};
          const type = q.type === 'double' ? ('double' as const) : ('single' as const);
          const quantity = Math.max(0, Math.floor(Number(q.quantity) || 0));
          return { type, quantity };
        })
        .filter((g) => g.quantity > 0)
    : [];

  const gate_placements: LayoutGatePlacement[] = Array.isArray(o.gate_placements)
    ? o.gate_placements.map((row) => {
        const q = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        const type = q.type === 'double' ? ('double' as const) : ('single' as const);
        const line_index = Math.max(0, Math.floor(Number(q.line_index) || 0));
        const x = Number(q.x);
        const y = Number(q.y);
        return {
          type,
          line_index,
          ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
        };
      })
    : [];

  const joint_terminations = Array.isArray(o.joint_terminations)
    ? o.joint_terminations.map((row) => {
        const q = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        return {
          h_post: q.h_post !== false,
          u_channel: q.u_channel === true,
        };
      })
    : undefined;

  const totalN = Number(o.total_length_ft);
  return {
    points,
    segments,
    gates,
    gate_placements,
    joint_terminations,
    total_length_ft: Number.isFinite(totalN) ? totalN : 0,
  };
}

export function lineHighlightModesFromDrawing(raw: unknown): LineHighlightMode[] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const segments = Array.isArray(o.segments) ? o.segments : [];
  const assignments = Array.isArray(o.segment_assignments) ? o.segment_assignments : null;
  if (!assignments) return undefined;
  return Array.from({ length: segments.length }, (_, i) => {
    const row = assignments[i];
    const ids = Array.isArray(row) ? row.filter((x) => typeof x === 'string') : [];
    if (ids.length === 0) return 'none';
    if (ids.length === 1) return 'private';
    return 'shared';
  });
}
