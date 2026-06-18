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
/**
 * Degrees: colinear snap while drawing, straight merge, and “no U” band share this.
 * Product rule: any line meeting another at more than 10° from straight is a corner —
 * it needs a post and a U-channel at that point.
 */
export const LAYOUT_STRAIGHT_MAX_DEG = 10;

/** Snap sketch segment starts to the prior segment’s end (ft) so one physical post = one vertex. */
export const LAYOUT_CHAIN_ALIGN_FT = 0.5;

/** Merge sketch endpoints within this distance (ft) onto one post — covers small canvas gaps at corners. */
export const LAYOUT_ENDPOINT_MERGE_FT = 1.5;

/** After chaining, drop links shorter than this (ft) to remove jitter / duplicate dots on one post. */
export const LAYOUT_MIN_SKETCH_SEGMENT_FT = 0.08;

/** PVC workbook gate width bands (Material Calculator — PVC sheet). */
export const PVC_SHORT_GATE_MAX_IN = 59.5;
export const PVC_SINGLE_GATE_MIN_IN = 65.5;
export const PVC_DOUBLE_GATE_MIN_IN = 106;
/** Default pedestrian gate opening when dropped on a fence line (standard 4′ walk gate). */
export const PVC_STANDARD_GATE_WIDTH_IN = 48;

export type SketchGatePlacement = {
  type: 'single' | 'double';
  line_index: number;
  /** Click position on the line (ft); restored when reopening the sketch. */
  x?: number;
  y?: number;
  /** User-edited opening width (in) from the material calculator; overrides defaults. */
  width_in?: number;
  /** Fence length (ft) from line start to gate opening — set when line was split for this gate. */
  left_ft?: number;
};

export type LayoutPt = { x: number; y: number };

/**
 * Gate opening span along a segment (ft coords), centered on `center`.
 * Returns edge points and left/right fence lengths using the segment's typed length.
 */
export function gateSpanAlongSegment(
  seg: [LayoutPt, LayoutPt],
  center: LayoutPt,
  gateWidthFt: number,
  segmentLengthFt: number
): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t0: number;
  t1: number;
  leftFt: number;
  rightFt: number;
} | null {
  const ax = seg[0].x;
  const ay = seg[0].y;
  const bx = seg[1].x;
  const by = seg[1].y;
  const dx = bx - ax;
  const dy = by - ay;
  const geomLen = dist(seg[0], seg[1]);
  if (geomLen < 1e-6 || gateWidthFt <= 0) return null;
  const typedLen = segmentLengthFt > 0 ? segmentLengthFt : geomLen;
  if (typedLen <= 0) return null;

  const ux = dx / geomLen;
  const uy = dy / geomLen;
  let t = ((center.x - ax) * ux + (center.y - ay) * uy) / geomLen;
  t = Math.max(0, Math.min(1, t));

  // Gate opening span follows drawn geometry; material left/right lengths use typed total.
  const halfNorm = gateWidthFt / 2 / geomLen;
  const t0 = Math.max(0, t - halfNorm);
  const t1 = Math.min(1, t + halfNorm);
  if (t1 - t0 < 0.001) return null;

  const leftFt = Math.round(t0 * typedLen * 100) / 100;
  const rightFt = Math.round((1 - t1) * typedLen * 100) / 100;

  return {
    x1: ax + dx * t0,
    y1: ay + dy * t0,
    x2: ax + dx * t1,
    y2: ay + dy * t1,
    t0,
    t1,
    leftFt,
    rightFt,
  };
}

/** True when a gate on this segment should split it into left fence | gate run | right fence. */
export function shouldSplitSegmentForGate(segmentLengthFt: number, gateWidthFt: number): boolean {
  return segmentLengthFt > gateWidthFt + LAYOUT_MIN_SKETCH_SEGMENT_FT;
}

export function splitSegmentGeometryAtGate(
  seg: [LayoutPt, LayoutPt],
  center: LayoutPt,
  gateWidthFt: number,
  segmentLengthFt: number
): {
  leftSeg: [LayoutPt, LayoutPt];
  gateSeg: [LayoutPt, LayoutPt];
  rightSeg: [LayoutPt, LayoutPt];
  leftFt: number;
  gateFt: number;
  rightFt: number;
} | null {
  const span = gateSpanAlongSegment(seg, center, gateWidthFt, segmentLengthFt);
  if (!span) return null;
  const gateFt = Math.round(gateWidthFt * 100) / 100;
  return {
    leftSeg: [seg[0], { x: span.x1, y: span.y1 }],
    gateSeg: [{ x: span.x1, y: span.y1 }, { x: span.x2, y: span.y2 }],
    rightSeg: [{ x: span.x2, y: span.y2 }, seg[1]],
    leftFt: span.leftFt,
    gateFt,
    rightFt: span.rightFt,
  };
}

/** Role of a sketch segment relative to a placed gate (after auto-split). */
export type SegmentRunEnds = {
  start: { h_post: boolean; u_channel: boolean };
  end: { h_post: boolean; u_channel: boolean };
};

/** Gate on a fence line between left/right segments (inline split), not a standalone gate-only run. */
export function isInlineGateSplitPlacement(gateLineIndex: number, segmentCount: number): boolean {
  return gateLineIndex > 0 && gateLineIndex < segmentCount - 1;
}

/** Standalone gate run (whole segment is the opening), not an inline left|gate|right split. */
export function isDedicatedGateSegmentIndex(
  segmentIndex: number,
  gatePlacements: SketchGatePlacement[] | null | undefined,
  segmentCount: number,
  segments?: { length_ft?: number }[] | null
): boolean {
  if (!gatePlacements?.length) return false;
  const segLenIn = Math.max(0, Number(segments?.[segmentIndex]?.length_ft) || 0) * 12;
  return gatePlacements.some((g) => {
    if (g.line_index !== segmentIndex) return false;
    if (isInlineGateSplitPlacement(g.line_index, segmentCount)) return false;
    // Long fence runs with an inline gate are not dedicated gate-only segments.
    return segLenIn > 0 && segLenIn < PVC_SHORT_GATE_MAX_IN;
  });
}

export function sketchGateSegmentRole(
  segmentIndex: number,
  gatePlacements?: SketchGatePlacement[] | null,
  segmentCount?: number,
  segments?: { length_ft?: number }[] | null
): 'gate' | 'left_fence' | 'right_fence' | null {
  if (!gatePlacements?.length) return null;
  const n =
    segmentCount ??
    Math.max(segmentIndex + 1, ...gatePlacements.map((g) => g.line_index + 2));
  for (const g of gatePlacements) {
    const gi = g.line_index;
    if (gi === segmentIndex) {
      if (isInlineGateSplitPlacement(gi, n)) return 'gate';
      const segLenIn = Math.max(0, Number(segments?.[segmentIndex]?.length_ft) || 0) * 12;
      if (segLenIn > 0 && segLenIn < PVC_SHORT_GATE_MAX_IN) return 'gate';
      return null;
    }
    if (!isInlineGateSplitPlacement(gi, n)) continue;
    if (segmentIndex === gi - 1) return 'left_fence';
    if (segmentIndex === gi + 1) return 'right_fence';
  }
  return null;
}

/**
 * Display label for a sketch segment. When a gate splits a run, all three parts share the
 * original run number: "Run 3 left side", "Run 3 gate", "Run 3 right side".
 */
export function sketchSegmentRunLabel(
  segmentIndex: number,
  segmentCount: number,
  netLengthFt: number,
  gatePlacements?: SketchGatePlacement[] | null,
  segments?: { length_ft?: number }[] | null
): string {
  const role = sketchGateSegmentRole(segmentIndex, gatePlacements, segmentCount, segments);
  if (role && gatePlacements?.length) {
    for (const g of gatePlacements) {
      const gi = g.line_index;
      if (!isInlineGateSplitPlacement(gi, segmentCount)) continue;
      if (segmentIndex === gi - 1 || segmentIndex === gi || segmentIndex === gi + 1) {
        const parent = gi;
        if (role === 'left_fence') return `Run ${parent} left side`;
        if (role === 'gate') return `Run ${parent} gate`;
        if (role === 'right_fence') return `Run ${parent} right side`;
      }
    }
  }
  const n = segmentIndex + 1;
  const gateOnSeg = gatePlacements?.some((g) => g.line_index === segmentIndex);
  if (gateOnSeg && netLengthFt <= 0) return `Run ${n} gate`;
  return `Run ${n}`;
}

function computeSegmentRunEndsAtAlignedIndex(
  segs: LayoutSegmentFeet[],
  jointRanges: { start: number; end: number }[],
  joints: SketchJointTermination[],
  alignedIndex: number,
  sourceIndex: number,
  gatePlacements: SketchGatePlacement[] | null | undefined,
  chainAlign: number,
  segmentCount: number,
  segmentLengthsFt: { length_ft?: number }[]
): SegmentRunEnds {
  const gateRole = sketchGateSegmentRole(sourceIndex, gatePlacements, segmentCount, segmentLengthsFt);
  if (gateRole === 'gate') {
    return {
      start: { h_post: false, u_channel: false },
      end: { h_post: false, u_channel: false },
    };
  }
  if (gateRole === 'left_fence' || gateRole === 'right_fence') {
    const gi = gateRole === 'left_fence' ? sourceIndex + 1 : sourceIndex - 1;
    if (isInlineGateSplitPlacement(gi, segmentCount)) {
      return {
        start: { h_post: true, u_channel: false },
        end: { h_post: true, u_channel: false },
      };
    }
  }
  const { start, end } = jointRanges[alignedIndex];
  const connectedToPrev = sketchSegmentStartConnectedToPrev(segs, alignedIndex, chainAlign);
  const sharesStartPost = sketchSegmentStartSharesExistingPost(segs, alignedIndex);
  const endPost = !!joints[end]?.h_post;
  const endU = !!joints[end]?.u_channel;
  const startPost = !connectedToPrev && !sharesStartPost && !!joints[start]?.h_post;
  const startU = !connectedToPrev && !sharesStartPost && !!joints[start]?.u_channel;
  const fenceEndsAtDedicatedGate = isDedicatedGateSegmentIndex(
    sourceIndex + 1,
    gatePlacements,
    segmentCount,
    segmentLengthsFt
  );
  return {
    start: { h_post: startPost, u_channel: startU },
    end: {
      h_post: fenceEndsAtDedicatedGate ? false : endPost,
      u_channel: fenceEndsAtDedicatedGate ? false : endU,
    },
  };
}

/** Start/end H-post and U-channel for one sketch segment (for fence-run UI). */
export function segmentRunEndTerminationsForSketch(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  segmentIndex: number,
  opts?: {
    snapStraightDeg?: number;
    chainAlignFt?: number;
    minSegFt?: number;
    jointTerminations?: SketchJointTermination[] | null;
    gatePlacements?: SketchGatePlacement[] | null;
  }
): SegmentRunEnds | null {
  const straightMax = opts?.snapStraightDeg ?? LAYOUT_STRAIGHT_MAX_DEG;
  const chainAlign = opts?.chainAlignFt ?? LAYOUT_CHAIN_ALIGN_FT;
  const minSeg = opts?.minSegFt ?? LAYOUT_MIN_SKETCH_SEGMENT_FT;
  const indexed = alignChainedSketchSegmentsIndexed(segments, lengthPerSegmentFt, chainAlign, minSeg);
  const alignedIndex = indexed.findIndex((x) => x.sourceIndex === segmentIndex);
  if (alignedIndex < 0) return null;
  const segs = indexed.map((x) => x.seg);
  const jointRanges = segmentJointIndexRanges(segs, chainAlign);
  const expectedJointCount = jointPositionsFromAligned(segs, chainAlign).length;
  const useJoints = opts?.jointTerminations && opts.jointTerminations.length === expectedJointCount;
  let joints = useJoints
    ? opts.jointTerminations!
    : defaultJointTerminationsFromAligned(segs, straightMax);
  const segmentLengthsFt = lengthPerSegmentFt.map((ft) => ({ length_ft: ft }));
  return computeSegmentRunEndsAtAlignedIndex(
    segs,
    jointRanges,
    joints,
    alignedIndex,
    segmentIndex,
    opts?.gatePlacements,
    chainAlign,
    segments.length,
    segmentLengthsFt
  );
}

/** True when this segment is the left or right fence beside a split in-line gate. */
export function isSplitGateFenceSide(
  segmentIndex: number,
  segmentCount: number,
  gatePlacements?: SketchGatePlacement[] | null,
  segments?: { length_ft?: number }[] | null
): boolean {
  const role = sketchGateSegmentRole(segmentIndex, gatePlacements, segmentCount, segments);
  if (role !== 'left_fence' && role !== 'right_fence') return false;
  const gi = role === 'left_fence' ? segmentIndex + 1 : segmentIndex - 1;
  return isInlineGateSplitPlacement(gi, segmentCount);
}

/**
 * Fence-run length for material math: split fence sides use gross; inline gates subtract opening;
 * standalone gate-only segments return 0.
 */
export function fenceCalcLengthFtForSketchFenceRun(
  segmentIndex: number,
  grossLengthFt: number,
  sketch: {
    segments?: { length_ft?: number }[];
    gate_placements?: SketchGatePlacement[] | null;
  } | null | undefined
): number {
  if (!sketch?.segments?.length) return grossLengthFt;
  const { segments, gate_placements } = sketch;
  const segmentCount = segments.length;
  if (sketchGateSegmentRole(segmentIndex, gate_placements, segmentCount, segments) === 'gate') {
    return 0;
  }
  if (isSplitGateFenceSide(segmentIndex, segmentCount, gate_placements, segments)) {
    return grossLengthFt;
  }
  return netFenceLengthFtForSegment(segmentIndex, grossLengthFt, gate_placements, segments);
}

/** Joint indices at gate opening edges — fence runs must not add U-channels here (gate block owns them). */
export function gateBoundaryJointIndices(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  gatePlacements?: SketchGatePlacement[] | null,
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT,
  minSegFt = LAYOUT_MIN_SKETCH_SEGMENT_FT
): Set<number> {
  const out = new Set<number>();
  if (!gatePlacements?.length) return out;
  const indexed = alignChainedSketchSegmentsIndexed(
    segments,
    lengthPerSegmentFt,
    chainAlignFt,
    minSegFt
  );
  if (indexed.length === 0) return out;
  const segs = indexed.map((x) => x.seg);
  const ranges = segmentJointIndexRanges(segs, chainAlignFt);
  for (const g of gatePlacements) {
    const gi = g.line_index;
    const gateAlignIdx = indexed.findIndex((x) => x.sourceIndex === gi);
    if (gateAlignIdx < 0) continue;
    const hasLeft = indexed.some((x) => x.sourceIndex === gi - 1);
    const hasRight = indexed.some((x) => x.sourceIndex === gi + 1);
    if (!hasLeft && !hasRight) continue;
    const { start, end } = ranges[gateAlignIdx];
    if (hasLeft) out.add(start);
    if (hasRight) out.add(end);
  }
  return out;
}

/** Clear fence U-channel flags at gate-opening joints so only the gate calculator counts them. */
export function applyGateBoundaryJointOverrides(
  joints: SketchJointTermination[],
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  gatePlacements?: SketchGatePlacement[] | null
): SketchJointTermination[] {
  const boundary = gateBoundaryJointIndices(segments, lengthPerSegmentFt, gatePlacements);
  if (boundary.size === 0) return joints;
  return joints.map((j, i) => (boundary.has(i) ? { ...j, u_channel: false } : j));
}

/** Per vertex along the sketch: open ends, disconnected run starts, and corners. */
export type SketchJointTermination = { h_post: boolean; u_channel: boolean };

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

/**
 * Gate opening width (in) for a sketch placement.
 * - Dedicated short gate run (line length &lt; 59.5″): the whole segment length is the opening.
 * - Single gate on a longer fence line: standard 48″ walk gate (not the full line length).
 * - Double gate on a fence line: workbook minimum 106″ unless a custom width is set.
 */
export function sketchGateWidthInches(
  placement: SketchGatePlacement,
  segments: { length_ft?: number }[]
): number {
  const custom = Number(placement.width_in);
  if (Number.isFinite(custom) && custom > 0) return custom;

  const idx = Math.max(0, Math.min(segments.length - 1, Number(placement.line_index) || 0));
  const lengthFt = Math.max(0, Number(segments[idx]?.length_ft) || 0);
  const widthRawIn = lengthFt * 12;

  if (widthRawIn > 0 && widthRawIn < PVC_SHORT_GATE_MAX_IN) return widthRawIn;
  if (placement.type === 'double') return PVC_DOUBLE_GATE_MIN_IN;
  return PVC_STANDARD_GATE_WIDTH_IN;
}

/** Fence run length after subtracting gate openings placed on that segment (avoids double-counting). */
export function netFenceLengthFtForSegment(
  segmentIndex: number,
  grossLengthFt: number,
  gatePlacements?: SketchGatePlacement[] | null,
  segments?: { length_ft?: number }[] | null
): number {
  if (!gatePlacements?.length || !segments?.length) {
    return Math.max(0, Math.round(grossLengthFt * 100) / 100);
  }
  let subtractFt = 0;
  for (const g of gatePlacements) {
    if (g.line_index === segmentIndex) {
      subtractFt += sketchGateWidthInches(g, segments) / 12;
    }
  }
  const net = grossLengthFt - subtractFt;
  return Math.max(0, Math.round(net * 100) / 100);
}

export function netFenceLengthsFromSketch(
  segments: { length_ft?: number }[],
  gatePlacements?: SketchGatePlacement[] | null
): number[] {
  return segments.map((s, i) => {
    const gross = Math.max(0, Number(s.length_ft) || 0);
    return netFenceLengthFtForSegment(i, gross, gatePlacements, segments);
  });
}

/** Stored segment length when set; otherwise sketch geometry (ft). Used for corner alignment — not net-after-gate. */
export function grossLengthFtForSketchSegment(
  segmentIndex: number,
  pair: LayoutPt[] | null | undefined,
  segments: { length_ft?: number }[]
): number {
  const raw = segments[segmentIndex]?.length_ft;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  if (pair && pair.length >= 2) return Math.max(1e-6, dist(pair[0], pair[1]));
  return 0;
}

/**
 * Resize one sketch segment to `newLengthFt` along its current direction, update stored `length_ft` values
 * (and following segments when geometry shifts), and refresh `total_length_ft`. Supports disjoint pairs
 * (`points.length === 2 * segments.length`) and polyline (`points.length === segments.length + 1`).
 */
export function adjustLayoutDrawingSegmentLength<
  T extends {
    points: LayoutPt[];
    segments: { length_ft: number }[];
    gates?: { type: 'single' | 'double'; quantity: number }[];
    gate_placements?: { type: 'single' | 'double'; line_index: number }[];
    total_length_ft?: number;
    joint_terminations?: SketchJointTermination[];
  },
>(drawing: T, segmentIndex: number, newLengthFt: number): T | null {
  const m = drawing.segments.length;
  if (segmentIndex < 0 || segmentIndex >= m) return null;
  const L = Number(newLengthFt);
  if (!Number.isFinite(L) || L <= 0) return null;

  const pairs = layoutPointsToSegmentPairs(drawing.points, drawing.segments);
  const pair = pairs[segmentIndex];
  if (!pair || pair.length < 2) return null;
  const ax = pair[0].x;
  const ay = pair[0].y;
  const bx = pair[1].x;
  const by = pair[1].y;
  const dx = bx - ax;
  const dy = by - ay;
  const cur = hypot(dx, dy);
  if (cur < 1e-9) return null;
  const nx = ax + (dx / cur) * L;
  const ny = ay + (dy / cur) * L;

  const pts = drawing.points.map((p) => ({ ...p }));
  const segs = drawing.segments.map((s) => ({
    ...s,
    length_ft: Number(s.length_ft) || 0,
  }));
  segs[segmentIndex] = { ...segs[segmentIndex], length_ft: Math.round(L * 100) / 100 };

  const n = pts.length;

  if (m > 0 && n === 2 * m) {
    pts[segmentIndex * 2 + 1] = { x: nx, y: ny };
    if (segmentIndex + 1 < m) {
      const nextStartIdx = (segmentIndex + 1) * 2;
      const oldEnd = { x: bx, y: by };
      if (dist(oldEnd, pts[nextStartIdx]) <= LAYOUT_ENDPOINT_MERGE_FT) {
        pts[nextStartIdx] = { x: nx, y: ny };
      }
    }
  } else if (m > 0 && n === m + 1) {
    pts[segmentIndex + 1] = { x: nx, y: ny };
    const deltaX = nx - bx;
    const deltaY = ny - by;
    for (let j = segmentIndex + 2; j < n; j++) {
      pts[j] = { x: pts[j].x + deltaX, y: pts[j].y + deltaY };
    }
  } else {
    return null;
  }

  const total = segs.reduce((a, s) => a + (Number(s.length_ft) || 0), 0);

  return {
    ...drawing,
    points: pts,
    segments: segs,
    total_length_ft: Math.round(total * 100) / 100,
  };
}

/**
 * Remove one sketch segment (and its geometry) from saved layout drawing data.
 * Supports disjoint pairs (`points.length === 2 * segments.length`) and polyline
 * (`points.length === segments.length + 1`).
 */
export function removeLayoutDrawingSegment<
  T extends {
    points: LayoutPt[];
    segments: { length_ft: number }[];
    gates?: { type: 'single' | 'double'; quantity: number }[];
    gate_placements?: { type: 'single' | 'double'; line_index: number }[];
    total_length_ft?: number;
    joint_terminations?: SketchJointTermination[];
  },
>(drawing: T, segmentIndex: number): T | null {
  const m = drawing.segments.length;
  if (segmentIndex < 0 || segmentIndex >= m) return null;

  const segs = drawing.segments.filter((_, j) => j !== segmentIndex);
  const n = drawing.points.length;
  let pts: LayoutPt[];

  if (m > 0 && n === 2 * m) {
    pts = [...drawing.points.slice(0, segmentIndex * 2), ...drawing.points.slice(segmentIndex * 2 + 2)];
  } else if (m > 0 && n === m + 1) {
    pts = [...drawing.points.slice(0, segmentIndex + 1), ...drawing.points.slice(segmentIndex + 2)];
  } else {
    return null;
  }

  const gate_placements = drawing.gate_placements
    ?.filter((g) => g.line_index !== segmentIndex)
    .map((g) => (g.line_index > segmentIndex ? { ...g, line_index: g.line_index - 1 } : g));

  let joint_terminations = drawing.joint_terminations;
  if (joint_terminations?.length === m + 1) {
    joint_terminations = joint_terminations.filter((_, j) => j !== segmentIndex + 1);
  }
  const pairsAfter = layoutPointsToSegmentPairs(pts, segs);
  const alAfter = alignChainedSketchSegments(
    pairsAfter,
    segs.map((s) => Number(s.length_ft) || 0)
  );
  const expectedAfter = jointPositionsFromAligned(alAfter).length;
  if (joint_terminations && joint_terminations.length !== expectedAfter) {
    joint_terminations = undefined;
  }

  const total = segs.reduce((a, s) => a + (Number(s.length_ft) || 0), 0);

  return {
    ...drawing,
    points: pts,
    segments: segs,
    ...(gate_placements ? { gate_placements } : {}),
    ...(joint_terminations ? { joint_terminations } : {}),
    total_length_ft: Math.round(total * 100) / 100,
  };
}

/** Remove one sketch gate marker (by placement index) and refresh aggregate gate counts. */
export function removeLayoutDrawingGatePlacement<
  T extends {
    points: LayoutPt[];
    segments: { length_ft: number }[];
    gates?: { type: 'single' | 'double'; quantity: number }[];
    gate_placements?: { type: 'single' | 'double'; line_index: number }[];
    total_length_ft?: number;
    joint_terminations?: SketchJointTermination[];
  },
>(drawing: T, placementIndex: number): T | null {
  const gp = drawing.gate_placements;
  if (!gp || placementIndex < 0 || placementIndex >= gp.length) return null;

  const gate_placements = gp.filter((_, i) => i !== placementIndex);
  const singleCount = gate_placements.filter((g) => g.type === 'single').length;
  const doubleCount = gate_placements.filter((g) => g.type === 'double').length;
  const gates = [
    ...(singleCount > 0 ? [{ type: 'single' as const, quantity: singleCount }] : []),
    ...(doubleCount > 0 ? [{ type: 'double' as const, quantity: doubleCount }] : []),
  ];

  return { ...drawing, gate_placements, gates };
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
 * True when two or more segment endpoints meet at `P` and any pair turns more than
 * `thresholdDeg` away from a straight continuation. Checks ALL segments (not just
 * consecutive ones), so a line starting at another line's start/end still counts as a corner.
 */
export function isCornerAtPoint(
  al: LayoutSegmentFeet[],
  P: LayoutPt,
  thresholdDeg = LAYOUT_STRAIGHT_MAX_DEG,
  tolFt = LAYOUT_CHAIN_ALIGN_FT
): boolean {
  const dirsAway: { x: number; y: number }[] = [];
  for (const s of al) {
    if (dist(s.a, P) <= tolFt) dirsAway.push({ x: s.b.x - s.a.x, y: s.b.y - s.a.y });
    if (dist(s.b, P) <= tolFt) dirsAway.push({ x: s.a.x - s.b.x, y: s.a.y - s.b.y });
  }
  if (dirsAway.length < 2) return false;
  for (let i = 0; i < dirsAway.length; i++) {
    for (let j = i + 1; j < dirsAway.length; j++) {
      // Straight continuation = away-directions are opposite (180° apart).
      const away = angleBetweenDirectionsDeg(dirsAway[i], dirsAway[j]);
      if (Math.abs(180 - away) > thresholdDeg) return true;
    }
  }
  return false;
}

/** Whether segment i's start shares a post with segment i−1's end (within chain-align tolerance). */
export function sketchSegmentStartConnectedToPrev(
  al: LayoutSegmentFeet[],
  segmentIndex: number,
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT
): boolean {
  if (segmentIndex <= 0 || segmentIndex >= al.length) return false;
  return dist(al[segmentIndex].a, al[segmentIndex - 1].b) <= chainAlignFt;
}

/**
 * True when another run ends (or starts) at the same post as segment i's start — e.g. T-junctions where
 * the vertical run starts where a horizontal run ends. That post is owned by the ending run, not both.
 */
export function sketchSegmentStartSharesExistingPost(
  al: LayoutSegmentFeet[],
  segmentIndex: number,
  mergeFt = LAYOUT_ENDPOINT_MERGE_FT
): boolean {
  if (segmentIndex < 0 || segmentIndex >= al.length) return false;
  const start = al[segmentIndex].a;
  for (let j = 0; j < al.length; j++) {
    if (j === segmentIndex) continue;
    if (dist(start, al[j].b) <= mergeFt) return true;
  }
  return false;
}

function snapToPriorEndpoints(p: LayoutPt, prior: LayoutSegmentFeet[], mergeFt: number): LayoutPt {
  let best: LayoutPt | null = null;
  let bestD = Infinity;
  for (const s of prior) {
    for (const anchor of [s.a, s.b]) {
      const d = dist(p, anchor);
      if (d <= mergeFt && d < bestD) {
        bestD = d;
        best = anchor;
      }
    }
  }
  return best ? { ...best } : p;
}

/**
 * Joint vertex positions: each open end and corner that needs a post marker.
 * Connected segments share one joint at their meeting point; disconnected runs include both ends.
 */
export function jointPositionsFromAligned(
  al: LayoutSegmentFeet[],
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT
): LayoutPt[] {
  if (al.length === 0) return [];
  const positions: LayoutPt[] = [{ ...al[0].a }];
  for (let i = 0; i < al.length; i++) {
    positions.push({ ...al[i].b });
    if (i + 1 < al.length && dist(al[i].b, al[i + 1].a) > chainAlignFt) {
      positions.push({ ...al[i + 1].a });
    }
  }
  return positions;
}

/** Start/end joint indices in `jointPositionsFromAligned` for each aligned segment. */
export function segmentJointIndexRanges(
  al: LayoutSegmentFeet[],
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT
): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let ji = 0;
  for (let i = 0; i < al.length; i++) {
    if (i > 0 && sketchSegmentStartConnectedToPrev(al, i, chainAlignFt)) {
      ji += 1;
      out.push({ start: out[i - 1].end, end: ji });
    } else {
      if (i > 0) ji += 1;
      const start = ji;
      ji += 1;
      out.push({ start, end: ji });
    }
  }
  return out;
}

/** Defaults: H-post at every joint; U wherever the lines meeting at that point turn more than the straight band. */
export function defaultJointTerminationsFromAligned(
  al: LayoutSegmentFeet[],
  thresholdDeg = LAYOUT_STRAIGHT_MAX_DEG,
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT
): SketchJointTermination[] {
  const jointPositions = jointPositionsFromAligned(al, chainAlignFt);
  return jointPositions.map((P) => ({ h_post: true, u_channel: isCornerAtPoint(al, P, thresholdDeg) }));
}

/**
 * Snap each segment’s start to the previous end when close, then drop micro-segments.
 * Ensures one physical corner → one joint angle → one U (on the ending run only).
 */
export function alignChainedSketchSegments(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT,
  minSegFt = LAYOUT_MIN_SKETCH_SEGMENT_FT,
  endpointMergeFt = LAYOUT_ENDPOINT_MERGE_FT
): LayoutSegmentFeet[] {
  return alignChainedSketchSegmentsIndexed(
    segments,
    lengthPerSegmentFt,
    chainAlignFt,
    minSegFt,
    endpointMergeFt
  ).map((x) => x.seg);
}

/** Like `alignChainedSketchSegments` but keeps the original sketch segment index for each aligned row. */
export function alignChainedSketchSegmentsIndexed(
  segments: LayoutPt[][],
  lengthPerSegmentFt: number[],
  chainAlignFt = LAYOUT_CHAIN_ALIGN_FT,
  minSegFt = LAYOUT_MIN_SKETCH_SEGMENT_FT,
  endpointMergeFt = LAYOUT_ENDPOINT_MERGE_FT
): { seg: LayoutSegmentFeet; sourceIndex: number }[] {
  const out: { seg: LayoutSegmentFeet; sourceIndex: number }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || seg.length < 2) continue;
    let a = snapToPriorEndpoints({ ...seg[0] }, out.map((x) => x.seg), endpointMergeFt);
    let b = snapToPriorEndpoints({ ...seg[1] }, out.map((x) => x.seg), endpointMergeFt);
    const Lraw = lengthPerSegmentFt[i];
    const Lnum = Number(Lraw);
    const hasExplicit = Number.isFinite(Lnum);
    let length_ft = hasExplicit ? Math.max(0, Lnum) : dist(a, b);
    if (length_ft <= 0) continue;

    if (out.length > 0) {
      const joint = out[out.length - 1].seg.b;
      if (dist(a, joint) <= chainAlignFt) {
        a = { ...joint };
        if (!hasExplicit) {
          length_ft = dist(a, b);
        }
      }
    }

    if (dist(a, b) < minSegFt) {
      if (hasExplicit && length_ft > 0) {
        const ox = seg[1].x - seg[0].x;
        const oy = seg[1].y - seg[0].y;
        const olen = hypot(ox, oy);
        if (olen >= 1e-9) {
          b = { x: a.x + (ox / olen) * length_ft, y: a.y + (oy / olen) * length_ft };
        } else {
          b = { x: a.x + length_ft, y: a.y };
        }
      } else {
        continue;
      }
    }

    out.push({ seg: { a, b, length_ft }, sourceIndex: i });
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

  return runs.map((r, i) => ({
    length_ft: r.length_ft,
    // First run owns the leading post of the chain (start + end); later runs share their start
    // post with the previous run, so they only add the post at their own end.
    fence_terminated_h_post_type: (i === 0 ? 2 : 1) as 0 | 1 | 2,
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
  opts?: {
    snapStraightDeg?: number;
    chainAlignFt?: number;
    minSegFt?: number;
    /** When length matches `jointPositionsFromAligned`, overrides corner-angle U logic for each vertex. */
    jointTerminations?: SketchJointTermination[] | null;
    /** Gate placements — fence runs must not terminate with posts/U at the gate opening. */
    gatePlacements?: SketchGatePlacement[] | null;
  }
): FmsPvcFenceLineInput[] {
  const straightMax = opts?.snapStraightDeg ?? LAYOUT_STRAIGHT_MAX_DEG;
  const chainAlign = opts?.chainAlignFt ?? LAYOUT_CHAIN_ALIGN_FT;
  const minSeg = opts?.minSegFt ?? LAYOUT_MIN_SKETCH_SEGMENT_FT;
  const jointTerminations = opts?.jointTerminations;
  const gatePlacements = opts?.gatePlacements;

  const indexed = alignChainedSketchSegmentsIndexed(segments, lengthPerSegmentFt, chainAlign, minSeg);
  const segs = indexed.map((x) => x.seg);
  if (segs.length === 0) return [];

  const jointRanges = segmentJointIndexRanges(segs, chainAlign);
  const expectedJointCount = jointPositionsFromAligned(segs, chainAlign).length;
  const useJoints = jointTerminations && jointTerminations.length === expectedJointCount;
  // Without explicit overrides, derive joints from topology: any two lines meeting at more
  // than `straightMax` from straight get a post + U-channel at that point.
  let joints = useJoints ? jointTerminations! : defaultJointTerminationsFromAligned(segs, straightMax);

  const segmentCount = segments.length;
  const segmentLengthsFt = lengthPerSegmentFt.map((ft) => ({ length_ft: ft }));
  const perAligned = segs.map((seg, i) => {
    const srcIdx = indexed[i].sourceIndex;
    const gateRole = sketchGateSegmentRole(srcIdx, gatePlacements, segmentCount, segmentLengthsFt);
    if (gateRole === 'gate') {
      return {
        length_ft: seg.length_ft,
        fence_terminated_h_post_type: 0 as const,
        fence_terminated_u_channel: 0,
        panel_module: panelModule,
      };
    }
    if (isSplitGateFenceSide(srcIdx, segmentCount, gatePlacements, segmentLengthsFt)) {
      return {
        length_ft: seg.length_ft,
        fence_terminated_h_post_type: 2 as const,
        fence_terminated_u_channel: 0,
        panel_module: panelModule,
      };
    }
    const ends = computeSegmentRunEndsAtAlignedIndex(
      segs,
      jointRanges,
      joints,
      i,
      srcIdx,
      gatePlacements,
      chainAlign,
      segmentCount,
      segmentLengthsFt
    );
    const d6 = Math.min(
      2,
      (ends.start.h_post ? 1 : 0) + (ends.end.h_post ? 1 : 0)
    ) as 0 | 1 | 2;
    const d7 = (ends.start.u_channel ? 1 : 0) + (ends.end.u_channel ? 1 : 0);
    return {
      length_ft: seg.length_ft,
      fence_terminated_h_post_type: d6,
      fence_terminated_u_channel: d7,
      panel_module: panelModule,
    };
  });

  const bySource = new Map<number, (typeof perAligned)[0]>();
  indexed.forEach((item, j) => {
    bySource.set(item.sourceIndex, perAligned[j]);
  });

  return segments.map((_, i) => {
    const hit = bySource.get(i);
    if (hit) return hit;
    const L = Math.max(0, Number(lengthPerSegmentFt[i]) || 0);
    return {
      length_ft: L,
      fence_terminated_h_post_type: 0 as const,
      fence_terminated_u_channel: 0,
      panel_module: panelModule,
    };
  });
}
