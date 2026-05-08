/**
 * Interpret saved layout drawing coordinates (flat feet ×y) into segment vertex pairs,
 * aligned with contractor layout drawings (same rules as LayoutDrawCanvas).
 */

export interface PlanarDrawingInput {
  points: { x: number; y: number }[];
  segments?: { length_ft?: number }[];
}

/** Flatten polyline pairs [a,b], [c,d], … matching LayoutDrawCanvas */
export function segmentPairsFromDrawingPoints(
  pts: { x: number; y: number }[],
  segMeta: { length_ft?: number }[]
): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = [];
  if (pts.length < 2) return out;
  const m = segMeta.length;

  if (m > 0 && pts.length === 2 * m) {
    for (let i = 0; i < m; i++) {
      out.push([pts[i * 2], pts[i * 2 + 1]]);
    }
    return out;
  }

  if (m > 0 && pts.length === m + 1) {
    for (let i = 0; i < m; i++) {
      out.push([pts[i], pts[i + 1]]);
    }
    return out;
  }

  const pairN = Math.floor(pts.length / 2);
  if (pairN >= 1 && m === pairN) {
    for (let i = 0; i < pairN; i++) {
      out.push([pts[i * 2], pts[i * 2 + 1]]);
    }
    return out;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    out.push([pts[i], pts[i + 1]]);
  }
  return out;
}

const EPS_XY = 0.015; // tolerance in layout feet (~1/5")

export function planarPointsClose(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.hypot(b.x - a.x, b.y - a.y) < EPS_XY;
}

function planarUnit(dx: number, dy: number): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  return { x: dx / len, y: dy / len };
}

/** Degrees along the polyline bend at B for path A→B→C */
export function planarTurnAngleDegrees(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): number {
  const d1 = planarUnit(bx - ax, by - ay);
  const d2 = planarUnit(cx - bx, cy - by);
  if (!d1 || !d2) return 180;
  const dot = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y));
  const rad = Math.acos(dot);
  return Math.round((((rad * 180) / Math.PI) + Number.EPSILON) * 100) / 100;
}

export interface PlanarCornerAnalysis {
  corners: number;
  anglesDeg: number[];
}

/** Returns turn angle between each adjacent segment pair plus structural corner tally. */
export function planarCornerAnalysis(
  drawing: PlanarDrawingInput | null | undefined,
  thresholdDeg: number
): PlanarCornerAnalysis {
  const thresh = Number(thresholdDeg);
  const eps = Number.isFinite(thresh) ? Math.min(179, Math.max(0, thresh)) : 15;
  if (!drawing?.points?.length || drawing.points.length < 2) return { corners: 0, anglesDeg: [] };

  const meta = Array.isArray(drawing.segments) ? drawing.segments : [];
  const pairs = segmentPairsFromDrawingPoints(drawing.points, meta);
  if (pairs.length < 2) return { corners: 0, anglesDeg: [] };

  const anglesDeg: number[] = [];
  let corners = 0;

  for (let i = 0; i < pairs.length - 1; i++) {
    const s0 = pairs[i];
    const s1 = pairs[i + 1];
    if (s0.length < 2 || s1.length < 2) continue;
    const A = s0[0];
    const B = s0[1];
    const B2 = s1[0];
    const C = s1[1];
    if (!planarPointsClose(B, B2)) continue;

    const turn = planarTurnAngleDegrees(A.x, A.y, B.x, B.y, C.x, C.y);
    anglesDeg.push(turn);
    if (turn > eps && Math.abs(turn - 180) > eps) corners += 1;
  }

  return { corners, anglesDeg };
}
