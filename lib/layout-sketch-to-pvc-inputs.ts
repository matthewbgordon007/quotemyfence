/**
 * Turn layout sketch polylines (feet, x/y) into FMS PVC fence line inputs.
 * Rules (product spec):
 * - Vertices where the turn is within `STRAIGHT_MAX_DEG` of straight → treat as continuous straight run
 *   (merge for material; no extra U at that joint).
 * - Vertices where the turn is larger than that → one corner post with one U-channel: **D7=1 on exactly one
 *   fence run** (the run that ends at that post). The next run starts at the same post with D7=0 so U’s are not
 *   double-counted when job totals sum each line.
 * - Segment starts are snapped to the previous segment’s end when within `CHAIN_ALIGN_FT` so both “dots” at a
 *   corner share one joint for angle + U logic.
 * - Open fence: no U at global start / global end unless we add UI later.
 */

import type { FmsPvcFenceLineInput, FmsPvcPanelModule } from '@/lib/fms-pvc-material-calculator';

export const LAYOUT_SNAP_VERTEX_FT = 6;
/** Degrees: colinear snap while drawing, straight merge, and “no U” band share this (larger = more tolerance). */
export const LAYOUT_STRAIGHT_MAX_DEG = 25;

/** Snap sketch segment starts to the prior segment’s end (ft) so one physical post = one vertex. */
export const LAYOUT_CHAIN_ALIGN_FT = 0.5;

/** After chaining, drop links shorter than this (ft) to remove jitter / duplicate dots on one post. */
export const LAYOUT_MIN_SKETCH_SEGMENT_FT = 0.08;

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

/** All segment endpoints (for vertex snapping). */
export function segmentEndpointAnchors(segments: LayoutPt[][]): LayoutPt[] {
  const out: LayoutPt[] = [];
  for (const seg of segments) {
    if (seg.length >= 2) {
      out.push(seg[0], seg[1]);
    }
  }
  return out;
}

function nearestPointOnSegment(p: LayoutPt, a: LayoutPt, b: LayoutPt): LayoutPt {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const v2 = vx * vx + vy * vy;
  if (v2 < 1e-10) return { ...a };
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / v2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * vx, y: a.y + t * vy };
}

/**
 * Prefer snapping to a vertex within `vertexSnapFt` (closest such vertex wins).
 * Otherwise snap to the closest point on any segment within `edgeSnapFt`.
 * If `vertexAnchors` is set, only those points are considered for vertex snap (e.g. exclude line start).
 */
export function snapPointToSketchGeometry(
  p: LayoutPt,
  segments: LayoutPt[][],
  opts?: {
    vertexSnapFt?: number;
    edgeSnapFt?: number;
    vertexAnchors?: LayoutPt[];
  }
): LayoutPt {
  const vs = opts?.vertexSnapFt ?? LAYOUT_SNAP_VERTEX_FT;
  const es = opts?.edgeSnapFt ?? LAYOUT_SNAP_VERTEX_FT;
  const anchors = opts?.vertexAnchors ?? segmentEndpointAnchors(segments);

  let bestA: LayoutPt | null = null;
  let bestAD = Infinity;
  for (const a of anchors) {
    const d = dist(p, a);
    if (d <= vs && d < bestAD) {
      bestAD = d;
      bestA = a;
    }
  }
  if (bestA) return { ...bestA };

  let bestP: LayoutPt | null = null;
  let bestD = Infinity;
  for (const seg of segments) {
    if (seg.length < 2) continue;
    const np = nearestPointOnSegment(p, seg[0], seg[1]);
    const d = dist(p, np);
    if (d <= es && d < bestD) {
      bestD = d;
      bestP = np;
    }
  }
  if (bestP) return { ...bestP };
  return p;
}

export interface LayoutSegmentFeet {
  a: LayoutPt;
  b: LayoutPt;
  length_ft: number;
}

/**
 * Snap each segment’s start to the previous end when close, then drop micro-segments.
 * Ensures one physical corner → one joint angle → one U (on the ending run only).
 */
export function alignChainedSketchSegments(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT,
  minSegFt = LAYOUT_MIN_SKETCH_SEGMENT_FT
): LayoutSegmentFeet[] {
  const out: LayoutSegmentFeet[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || seg.length < 2) continue;
    let a = { ...seg[0] };
    const b = { ...seg[1] };
    const Lraw = lengthPerSegmentFt[i];
    const Lnum = Number(Lraw);
    let length_ft = Number.isFinite(Lnum) && Lnum > 0 ? Lnum : dist(a, b);
    if (length_ft <= 0) continue;

    if (out.length > 0) {
      const joint = out[out.length - 1].b;
      if (dist(a, joint) <= chainAlignFt) {
        a = { ...joint };
        if (!Number.isFinite(Lnum) || Lnum <= 0) {
          length_ft = dist(a, b);
        }
      }
    }

    if (dist(a, b) < minSegFt) continue;

    out.push({ a, b, length_ft });
  }
  return out;
}

/**
 * Build merged straight runs and map to PVC inputs (D6=1, D7 = U count for that run’s ends at corners).
 */
export function layoutSegmentsToPvcFenceInputs(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  panelModule: FmsPvcPanelModule,
  opts?: { snapStraightDeg?: number; chainAlignFt?: number; minSegFt?: number }
): FmsPvcFenceLineInput[] {
  const straightMax = opts?.snapStraightDeg ?? LAYOUT_STRAIGHT_MAX_DEG;
  const chainAlign = opts?.chainAlignFt ?? LAYOUT_CHAIN_ALIGN_FT;
  const minSeg = opts?.minSegFt ?? LAYOUT_MIN_SKETCH_SEGMENT_FT;

  const segs = alignChainedSketchSegments(segments, lengthPerSegmentFt, chainAlign, minSeg);
  if (segs.length === 0) return [];

  type Run = { length_ft: number; uEnd: number };
  const runs: Run[] = [];
  let cur = { length_ft: segs[0].length_ft, uEnd: 0 };

  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1];
    const next = segs[i];
    const inLen = dist(prev.a, prev.b);
    const outLen = dist(prev.b, next.b);
    if (inLen < minSeg * 0.5 || outLen < minSeg * 0.5) {
      cur.length_ft += next.length_ft;
      continue;
    }
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

/**
 * One PVC fence line per drawn sketch segment (no merging of nearly straight runs).
 * D7 = 1 on a segment when the deflection to the next segment exceeds the straight band (same corner U rule).
 */
export function layoutSegmentsToPvcFenceInputsPerSketchSegment(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  panelModule: FmsPvcPanelModule,
  opts?: { snapStraightDeg?: number; chainAlignFt?: number; minSegFt?: number }
): FmsPvcFenceLineInput[] {
  const straightMax = opts?.snapStraightDeg ?? LAYOUT_STRAIGHT_MAX_DEG;
  const chainAlign = opts?.chainAlignFt ?? LAYOUT_CHAIN_ALIGN_FT;
  const minSeg = opts?.minSegFt ?? LAYOUT_MIN_SKETCH_SEGMENT_FT;

  const segs = alignChainedSketchSegments(segments, lengthPerSegmentFt, chainAlign, minSeg);
  if (segs.length === 0) return [];

  return segs.map((seg, i) => {
    let uEnd = 0;
    if (i < segs.length - 1) {
      const d = deflectionAtVertexDeg(segs[i].a, segs[i].b, segs[i + 1].b);
      if (d > straightMax) uEnd = 1;
    }
    return {
      length_ft: seg.length_ft,
      fence_terminated_h_post_type: 1,
      fence_terminated_u_channel: uEnd,
      panel_module: panelModule,
    };
  });
}
