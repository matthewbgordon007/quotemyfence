/**
 * Turn layout sketch polylines (feet, x/y) into FMS PVC fence line inputs.
 * Rules (product spec):
 * - Vertices where the turn is within `STRAIGHT_MAX_DEG` of straight → treat as continuous straight run
 *   (merge for material; no extra U at that joint).
 * - Vertices where the turn is larger than that → corner post with U-channel → +1 U on the run that ends there.
 * - Open fence: no U at global start / global end unless we add UI later.
 */

import type { FmsPvcFenceLineInput, FmsPvcPanelModule } from '@/lib/fms-pvc-material-calculator';

export const LAYOUT_SNAP_VERTEX_FT = 6;
export const LAYOUT_STRAIGHT_MAX_DEG = 10;

export type LayoutPt = { x: number; y: number };

/**
 * Rebuild segment pairs from saved layout `points` + `segments` metadata
 * (same rules as `LayoutDrawCanvas` / layout save).
 */
export function layoutPointsToSegmentPairs(
  pts: LayoutPt[],
  segMeta: { length_ft?: number }[]
): LayoutPt[][] {
  const out: LayoutPt[][] = [];
  if (pts.length < 2) return out;
  const m = segMeta.length;

  if (m > 0 && pts.length === 2 * m) {
    for (let i = 0; i < m; i++) {
      out.push([{ ...pts[i * 2] }, { ...pts[i * 2 + 1] }]);
    }
    return out;
  }

  if (m > 0 && pts.length === m + 1) {
    for (let i = 0; i < m; i++) {
      out.push([{ ...pts[i] }, { ...pts[i + 1] }]);
    }
    return out;
  }

  const pairN = Math.floor(pts.length / 2);
  if (pairN >= 1 && m === pairN) {
    for (let i = 0; i < pairN; i++) {
      out.push([{ ...pts[i * 2] }, { ...pts[i * 2 + 1] }]);
    }
    return out;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    out.push([{ ...pts[i] }, { ...pts[i + 1] }]);
  }
  return out;
}

function hypot(a: number, b: number): number {
  return Math.hypot(a, b);
}

function norm(v: { x: number; y: number }): { x: number; y: number } {
  const h = hypot(v.x, v.y);
  if (h < 1e-9) return { x: 0, y: 0 };
  return { x: v.x / h, y: v.y / h };
}

function dist(a: LayoutPt, b: LayoutPt): number {
  return hypot(b.x - a.x, b.y - a.y);
}

/** Angle in [0, 180] between directions v1 and v2 (magnitude of turn). */
export function angleBetweenDirectionsDeg(v1: { x: number; y: number }, v2: { x: number; y: number }): number {
  const n1 = norm(v1);
  const n2 = norm(v2);
  let dot = n1.x * n2.x + n1.y * n2.y;
  dot = Math.max(-1, Math.min(1, dot));
  return (Math.acos(dot) * 180) / Math.PI;
}

/**
 * Deflection at vertex B between segments A→B and B→C.
 * 0° = straight continuation (same bearing), 90° = right angle.
 */
export function deflectionAtVertexDeg(A: LayoutPt, B: LayoutPt, C: LayoutPt): number {
  const vIn = { x: B.x - A.x, y: B.y - A.y };
  const vOut = { x: C.x - B.x, y: C.y - B.y };
  return angleBetweenDirectionsDeg(vIn, vOut);
}

/** Snap C so B→C is colinear with A→B, preserving |B-C|. */
export function snapEndColinearWithPrev(A: LayoutPt, B: LayoutPt, C: LayoutPt): LayoutPt {
  const vIn = norm({ x: B.x - A.x, y: B.y - A.y });
  if (hypot(vIn.x, vIn.y) < 1e-9) return C;
  const len = dist(B, C);
  return { x: B.x + vIn.x * len, y: B.y + vIn.y * len };
}

/** If p is near anchor, return anchor; else p. */
export function snapPointToAnchorIfClose(p: LayoutPt, anchor: LayoutPt, snapFt: number): LayoutPt {
  if (dist(p, anchor) <= snapFt) return { ...anchor };
  return p;
}

/** If p is within snapFt of any anchor, snap to the closest anchor; else p. */
export function snapPointToNearestAnchorIfClose(p: LayoutPt, anchors: LayoutPt[], snapFt: number): LayoutPt {
  if (!anchors.length || snapFt <= 0) return p;
  let best: LayoutPt | null = null;
  let bestD = Infinity;
  for (const a of anchors) {
    const d = dist(p, a);
    if (d <= snapFt && d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best ? { ...best } : p;
}

export interface LayoutSegmentFeet {
  a: LayoutPt;
  b: LayoutPt;
  length_ft: number;
}

/**
 * Build merged straight runs and map to PVC inputs (D6=1, D7 = U count for that run’s ends at corners).
 */
export function layoutSegmentsToPvcFenceInputs(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  panelModule: FmsPvcPanelModule,
  opts?: { snapStraightDeg?: number }
): FmsPvcFenceLineInput[] {
  const straightMax = opts?.snapStraightDeg ?? LAYOUT_STRAIGHT_MAX_DEG;
  const segs: LayoutSegmentFeet[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || seg.length < 2) continue;
    const L = Number(lengthPerSegmentFt[i]);
    const len = Number.isFinite(L) && L > 0 ? L : dist(seg[0], seg[1]);
    if (len <= 0) continue;
    segs.push({ a: { ...seg[0] }, b: { ...seg[1] }, length_ft: len });
  }
  if (segs.length === 0) return [];

  type Run = { length_ft: number; uEnd: number };
  const runs: Run[] = [];
  let cur = { length_ft: segs[0].length_ft, uEnd: 0 };

  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1];
    const next = segs[i];
    const d = deflectionAtVertexDeg(prev.a, prev.b, next.b);
    const straight = d <= straightMax;
    if (straight) {
      cur.length_ft += next.length_ft;
    } else {
      cur.uEnd = 1;
      runs.push(cur);
      cur = { length_ft: next.length_ft, uEnd: 0 };
    }
  }
  runs.push(cur);

  return runs.map((r) => ({
    length_ft: r.length_ft,
    fence_terminated_h_post_type: 1,
    fence_terminated_u_channel: r.uEnd,
    panel_module: panelModule,
  }));
}
