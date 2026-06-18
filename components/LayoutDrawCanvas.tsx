'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  alignChainedSketchSegments,
  defaultJointTerminationsFromAligned,
  deflectionAtVertexDeg,
  gateSpanAlongSegment,
  jointPositionsFromAligned,
  LAYOUT_CHAIN_ALIGN_FT,
  LAYOUT_MIN_SKETCH_SEGMENT_FT,
  LAYOUT_STRAIGHT_MAX_DEG,
  layoutPointsToSegmentPairs,
  segmentEndpointAnchors,
  shouldSplitSegmentForGate,
  sketchGateWidthInches,
  sketchSegmentRunLabel,
  splitSegmentGeometryAtGate,
  snapEndColinearWithPrev,
  snapPointToSketchGeometry,
  type SketchJointTermination,
} from '@/lib/layout-sketch-to-pvc-inputs';

// Canvas uses feet as coordinate system. Origin at center.
const MIN_DRAW_SEGMENT_FT = 0.08;
/** Empty / origin view span in feet (before zoom). */
const BASE_VIEW_FT = 360;
const MIN_BBOX_SPAN_FT = 40;

/** Pixels-ish delta for wheel zoom (handles line/page deltaMode). */
function normalizeWheelDeltaY(e: WheelEvent): number {
  let dy = e.deltaY;
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16;
  else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= 500;
  return dy;
}

/** Multiplicative wheel zoom: trackpads emit many events; cap log step so flicks stay controllable. */
const WHEEL_ZOOM_LOG_SENS = 0.0011;
const WHEEL_ZOOM_MAX_LOG_STEP = 0.065;

export interface LayoutDrawCanvasRef {
  appendSegmentByLength: (lengthFt: number) => void;
}

export type LineHighlightMode = 'none' | 'private' | 'shared';

export type LayoutGatePlacement = {
  type: 'single' | 'double';
  line_index: number;
  x?: number;
  y?: number;
  width_in?: number;
  /** Fence length (ft) from line start to gate — set when the line was auto-split. */
  left_ft?: number;
};

export interface LayoutDrawCanvasProps {
  initialDrawing?: {
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft: number;
    /** Nearest line index per placed gate (export / calculator). */
    gate_placements?: LayoutGatePlacement[];
    /** One per chained vertex (aligned segment count + 1); drives PVC D6/D7 per sketch segment. */
    joint_terminations?: SketchJointTermination[];
  } | null;
  /** When true, fit view to drawing and hide editing controls */
  readOnly?: boolean;
  /** One entry per drawn line: none = unassigned, private = one homeowner, shared = 2+ */
  lineHighlightModes?: LineHighlightMode[];
  onDrawingChange?: (data: {
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    gate_placements: LayoutGatePlacement[];
    total_length_ft: number;
    joint_terminations?: SketchJointTermination[];
  }) => void;
  onReset?: () => void;
  /**
   * When true (default), stretch to fill a flex parent (layout editor). When false, use a fixed drawing height and
   * let the toolbar / length rows grow below so siblings (e.g. Unlock) are not painted over.
   */
  fillParent?: boolean;
  /**
   * When true, drawn geometry is treated as a schematic only: lengths are NOT derived from how long
   * the line was drawn — the user must type each line's length. Untyped lines export as length_ft 0.
   * Default (false) keeps the drawn distance as the fallback (quote/calculator flows).
   */
  manualLengths?: boolean;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lengthNumsForAlign(segs: { x: number; y: number }[][], lengths: string[]): number[] {
  return lengths.map((s, i) => {
    const seg = segs[i];
    const typed = parseFloat(s || '');
    if (Number.isFinite(typed) && typed > 0) return typed;
    if (seg && seg.length >= 2) return dist(seg[0], seg[1]);
    return 0;
  });
}

/** Vertices along the sketch after the same align step used for PVC (open ends + corners). */
function alignedFootVertices(segs: { x: number; y: number }[][], lengths: string[]): { x: number; y: number }[] {
  const nums = lengthNumsForAlign(segs, lengths);
  const al = alignChainedSketchSegments(segs, nums, LAYOUT_CHAIN_ALIGN_FT, LAYOUT_MIN_SKETCH_SEGMENT_FT);
  return jointPositionsFromAligned(al, LAYOUT_CHAIN_ALIGN_FT);
}

const LAYOUT_LABEL_VERTEX_EPS_FT = 0.4;

function segmentsShareEndpoint(
  sa: { x: number; y: number }[],
  sb: { x: number; y: number }[],
  eps = LAYOUT_LABEL_VERTEX_EPS_FT
): boolean {
  if (sa.length < 2 || sb.length < 2) return false;
  for (const a of [sa[0], sa[1]]) {
    for (const b of [sb[0], sb[1]]) {
      if (dist(a, b) <= eps) return true;
    }
  }
  return false;
}

/** Left | gate | right trio after an in-line gate split — labels stay near the drawn segment. */
function segmentInInlineGateSplit(
  segmentIndex: number,
  segmentCount: number,
  gates: { line_index: number }[]
): boolean {
  for (const g of gates) {
    const gi = g.line_index;
    if (gi <= 0 || gi >= segmentCount - 1) continue;
    if (segmentIndex === gi - 1 || segmentIndex === gi || segmentIndex === gi + 1) return true;
  }
  return false;
}

function nearestPointOnSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number } {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const v2 = vx * vx + vy * vy;
  if (v2 < 1e-10) return { ...a };
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / v2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * vx, y: a.y + t * vy };
}

function pointToSegmentDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const np = nearestPointOnSegment(p, a, b);
  return dist(p, np);
}

function nearestLineIndexForPoint(
  pt: { x: number; y: number },
  segs: { x: number; y: number }[][]
): number {
  let bestI = 0;
  let bestD = Infinity;
  segs.forEach((seg, i) => {
    if (seg.length < 2) return;
    const d = pointToSegmentDist(pt, seg[0], seg[1]);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  });
  return bestI;
}

type PlacedGate = {
  type: 'single' | 'double';
  x: number;
  y: number;
  line_index: number;
  width_in?: number;
  left_ft?: number;
  /** Gate marker placed before line length was entered — split once length is set. */
  awaiting_length?: boolean;
};

type GateSplitResult = {
  segments: { x: number; y: number }[][];
  lineLengths: string[];
  placedGates: PlacedGate[];
};

/** Split one segment into left | gate | right at the clicked center. */
function applyInlineGateSplit(
  segments: { x: number; y: number }[][],
  lineLengths: string[],
  placedGates: PlacedGate[],
  segIdx: number,
  gateType: 'single' | 'double',
  center: { x: number; y: number },
  typedLenFt: number,
  manualLengths: boolean
): GateSplitResult | null {
  const seg = segments[segIdx];
  if (!seg || seg.length < 2 || typedLenFt <= 0) return null;

  const segMeta = segments.map((s, si) => ({
    length_ft:
      si === segIdx
        ? typedLenFt
        : segmentLengthFtForGate(s, lineLengths[si] || '', manualLengths),
  }));
  const widthIn = sketchGateWidthInches({ type: gateType, line_index: segIdx }, segMeta);
  const gateWidthFt = widthIn / 12;
  if (!shouldSplitSegmentForGate(typedLenFt, gateWidthFt)) return null;

  const split = splitSegmentGeometryAtGate(
    [seg[0], seg[1]],
    center,
    gateWidthFt,
    typedLenFt
  );
  if (!split) return null;

  const nextSegments = [...segments];
  nextSegments.splice(segIdx, 1, split.leftSeg, split.gateSeg, split.rightSeg);

  const nextLengths = [...lineLengths];
  nextLengths.splice(
    segIdx,
    1,
    String(split.leftFt),
    String(split.gateFt),
    String(split.rightFt)
  );

  const gateIdx = segIdx + 1;
  const withoutAwaiting = placedGates.filter(
    (g) => !(g.awaiting_length && g.line_index === segIdx)
  );
  const nextGates = [
    ...withoutAwaiting.map((g) =>
      g.line_index > segIdx ? { ...g, line_index: g.line_index + 2 } : g
    ),
    {
      type: gateType,
      x: center.x,
      y: center.y,
      line_index: gateIdx,
      left_ft: split.leftFt,
    },
  ];

  return { segments: nextSegments, lineLengths: nextLengths, placedGates: nextGates };
}

/** After removing segment index `removed`, drop its gates and shift indices for segments that moved. */
function adjustPlacedGatesAfterSegmentRemoved(
  gates: PlacedGate[],
  removed: number
): PlacedGate[] {
  return gates
    .filter((g) => g.line_index !== removed)
    .map((g) => (g.line_index > removed ? { ...g, line_index: g.line_index - 1 } : g));
}

function strokeForLineMode(mode: LineHighlightMode | undefined): string {
  if (mode === 'private') return '#16a34a';
  if (mode === 'shared') return '#dc2626';
  return '#1e293b';
}

/** Visible world span (ft) — scales marker sizes so they stay readable at any zoom. */
function viewSpanFt(vw: number, vh: number): number {
  return Math.min(vw, vh);
}

function segmentLengthFtForGate(
  seg: { x: number; y: number }[],
  lengthStr: string,
  manualLengths: boolean
): number {
  const typed = parseFloat(lengthStr || '');
  if (Number.isFinite(typed) && typed > 0) return typed;
  if (manualLengths) return 0;
  if (seg.length >= 2) return dist(seg[0], seg[1]);
  return 0;
}

type FeetBBox = { minX: number; minY: number; maxX: number; maxY: number };

function addPointToBounds(b: FeetBBox | null, x: number, y: number): FeetBBox {
  if (!b) return { minX: x, maxX: x, minY: y, maxY: y };
  return {
    minX: Math.min(b.minX, x),
    maxX: Math.max(b.maxX, x),
    minY: Math.min(b.minY, y),
    maxY: Math.max(b.maxY, y),
  };
}

function boundsFromSketch(
  segments: { x: number; y: number }[][],
  placedGates: { x: number; y: number }[],
  currentPath: { x: number; y: number }[],
  previewDraw: { start: { x: number; y: number }; end: { x: number; y: number } } | null
): FeetBBox | null {
  let b: FeetBBox | null = null;
  for (const seg of segments) {
    for (const p of seg) b = addPointToBounds(b, p.x, p.y);
  }
  for (const g of placedGates) b = addPointToBounds(b, g.x, g.y);
  for (const p of currentPath) b = addPointToBounds(b, p.x, p.y);
  if (previewDraw) {
    b = addPointToBounds(b, previewDraw.start.x, previewDraw.start.y);
    b = addPointToBounds(b, previewDraw.end.x, previewDraw.end.y);
  }
  return b;
}

/** Ensures a minimum span so a single point or short stroke still has a usable window. */
function normalizeBoundsSpan(box: FeetBBox): FeetBBox {
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  let spanX = Math.max(box.maxX - box.minX, MIN_BBOX_SPAN_FT * 0.15);
  let spanY = Math.max(box.maxY - box.minY, MIN_BBOX_SPAN_FT * 0.15);
  if (spanX < MIN_BBOX_SPAN_FT) spanX = MIN_BBOX_SPAN_FT;
  if (spanY < MIN_BBOX_SPAN_FT) spanY = MIN_BBOX_SPAN_FT;
  return {
    minX: cx - spanX / 2,
    maxX: cx + spanX / 2,
    minY: cy - spanY / 2,
    maxY: cy + spanY / 2,
  };
}

/**
 * Center the given sketch and pick a zoom that fits it on screen. Used both for the
 * one-time framing on mount and for the manual "Fit" button. We deliberately do NOT
 * keep re-fitting while drawing (that caused jarring auto zoom in/out).
 */
function fitViewForSketch(
  segments: { x: number; y: number }[][],
  placedGates: { x: number; y: number }[]
): { zoom: number; pan: { x: number; y: number } } {
  const raw = boundsFromSketch(segments, placedGates, [], null);
  if (!raw) return { zoom: 1, pan: { x: 0, y: 0 } };
  const b0 = normalizeBoundsSpan(raw);
  const spanX = b0.maxX - b0.minX;
  const spanY = b0.maxY - b0.minY;
  const cx = (b0.minX + b0.maxX) / 2;
  const cy = (b0.minY + b0.maxY) / 2;
  const span = Math.max(spanX, spanY);
  const pad = Math.max(12, span * 0.14);
  const needed = Math.max(span + 2 * pad, 1);
  const zoom = Math.min(3, Math.max(0.25, BASE_VIEW_FT / needed));
  return { zoom, pan: { x: -cx, y: -cy } };
}

/** One-time framing for an existing/imported sketch on mount. */
function computeInitialFitView(
  initialDrawing: LayoutDrawCanvasProps['initialDrawing']
): { zoom: number; pan: { x: number; y: number } } {
  const pts = initialDrawing?.points ?? [];
  const segLens = initialDrawing?.segments ?? [];
  const segs = layoutPointsToSegmentPairs(pts, segLens);
  return fitViewForSketch(segs, []);
}

export const LayoutDrawCanvas = forwardRef<LayoutDrawCanvasRef, LayoutDrawCanvasProps>(
  function LayoutDrawCanvas(
    { initialDrawing, readOnly, lineHighlightModes, onDrawingChange, onReset, fillParent = true, manualLengths = false },
    ref
  ) {
    const fsRootRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    // Frame any existing/imported sketch once on mount. The component remounts (via key)
    // when a new sketch is imported, so this re-runs for fresh imports.
    const initialViewRef = useRef(computeInitialFitView(initialDrawing));
    // Each segment is exactly one line: [start, end]
    const [segments, setSegments] = useState<{ x: number; y: number }[][]>(() => {
      const pts = initialDrawing?.points ?? [];
      const segLens = initialDrawing?.segments ?? [];
      return layoutPointsToSegmentPairs(pts, segLens);
    });
    /** At most one point = start of current line; second click (or End line) finishes the segment. */
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
    const pointerDownPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const pointerDownTime = useRef(0);
    const isPanning = useRef(false);
    const [pan, setPan] = useState(initialViewRef.current.pan);
    const [placedGates, setPlacedGates] = useState<PlacedGate[]>(() => {
      const gates = initialDrawing?.gates ?? [];
      const pts = initialDrawing?.points ?? [];
      const segLens = initialDrawing?.segments ?? [];
      const initSegs = layoutPointsToSegmentPairs(pts, segLens);
      const gp = initialDrawing?.gate_placements;
      if (Array.isArray(gp) && gp.length > 0 && initSegs.length > 0) {
        return gp.map((row) => {
          const li = Math.max(0, Math.min(initSegs.length - 1, Number(row.line_index) || 0));
          const seg = initSegs[li];
          const t = row.type === 'double' ? 'double' : 'single';
          if (seg.length >= 2) {
            const mx = (seg[0].x + seg[1].x) / 2;
            const my = (seg[0].y + seg[1].y) / 2;
            const rx = Number(row.x);
            const ry = Number(row.y);
            const rw = Number(row.width_in);
            const rl = Number(row.left_ft);
            return {
              type: t,
              x: Number.isFinite(rx) && Number.isFinite(ry) ? rx : mx,
              y: Number.isFinite(rx) && Number.isFinite(ry) ? ry : my,
              line_index: li,
              ...(Number.isFinite(rw) && rw > 0 ? { width_in: rw } : {}),
              ...(Number.isFinite(rl) ? { left_ft: rl } : {}),
            };
          }
          return { type: t, x: 0, y: 0, line_index: li };
        });
      }
      const result: PlacedGate[] = [];
      const anchor =
        initSegs.length > 0 && initSegs[initSegs.length - 1].length >= 2
          ? initSegs[initSegs.length - 1][1]
          : pts.length >= 1
            ? pts[pts.length - 1]
            : { x: 0, y: 0 };
      const defaultLine =
        initSegs.length > 0 ? Math.max(0, initSegs.length - 1) : 0;
      let i = 0;
      for (const g of gates) {
        for (let q = 0; q < (g.quantity || 0); q++) {
          const x = anchor.x + 2 * (i % 3);
          const y = anchor.y + 2 * Math.floor(i / 3);
          const line_index =
            initSegs.length > 0 ? nearestLineIndexForPoint({ x, y }, initSegs) : defaultLine;
          result.push({
            type: g.type as 'single' | 'double',
            x,
            y,
            line_index,
          });
          i++;
        }
      }
      return result;
    });
    const [mode, setMode] = useState<
      'draw' | 'place_single_gate' | 'place_double_gate' | 'assign_line_ends'
    >('draw');
    const HIT_THRESHOLD = 8;
    const JOINT_HIT_FT = 8;
    const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null);
    const [lineLengths, setLineLengths] = useState<string[]>(() => {
      const pts = initialDrawing?.points ?? [];
      const segLens = initialDrawing?.segments ?? [];
      const initSegs = layoutPointsToSegmentPairs(pts, segLens);
      const n = initSegs.length;
      if (n === 0) return [];
      return Array.from({ length: n }, (_, i) => {
        const stored = segLens[i]?.length_ft;
        if (stored != null && (!manualLengths || stored > 0)) return String(stored);
        if (manualLengths) return '';
        const seg = initSegs[i];
        if (seg.length < 2) return '';
        return dist(seg[0], seg[1]).toFixed(1);
      });
    });
    const [jointTerminations, setJointTerminations] = useState<SketchJointTermination[]>(() => {
      const pts = initialDrawing?.points ?? [];
      const segLens = initialDrawing?.segments ?? [];
      const initSegs = layoutPointsToSegmentPairs(pts, segLens);
      if (initSegs.length === 0) return [];
      const initLens = Array.from({ length: initSegs.length }, (_, i) => {
        if (segLens[i]?.length_ft != null) return String(segLens[i].length_ft);
        const seg = initSegs[i];
        if (seg.length < 2) return '';
        return dist(seg[0], seg[1]).toFixed(1);
      });
      const nums = lengthNumsForAlign(initSegs, initLens);
      const al = alignChainedSketchSegments(initSegs, nums, LAYOUT_CHAIN_ALIGN_FT, LAYOUT_MIN_SKETCH_SEGMENT_FT);
      const jt = initialDrawing?.joint_terminations;
      const expectedJointCount = jointPositionsFromAligned(al, LAYOUT_CHAIN_ALIGN_FT).length;
      if (jt && jt.length === expectedJointCount) {
        return jt.map((j) => ({ h_post: j.h_post !== false, u_channel: j.u_channel === true }));
      }
      return defaultJointTerminationsFromAligned(al);
    });
    const [selectedJointIndex, setSelectedJointIndex] = useState<number | null>(null);
    const [zoom, setZoom] = useState(initialViewRef.current.zoom);

    useEffect(() => {
      function syncFs() {
        setIsFullscreen(document.fullscreenElement === fsRootRef.current);
      }
      document.addEventListener('fullscreenchange', syncFs);
      return () => document.removeEventListener('fullscreenchange', syncFs);
    }, []);

    async function toggleFullscreen() {
      const root = fsRootRef.current;
      if (!root) return;
      try {
        if (document.fullscreenElement) {
          const ex = document.exitFullscreen?.();
          if (ex) await ex;
          else (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
        } else {
          if (root.requestFullscreen) {
            await root.requestFullscreen();
          } else {
            (root as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.();
          }
        }
      } catch {
        /* user gesture / browser policy */
      }
    }

    const previewDraw = useMemo(() => {
      if (currentPath.length !== 1 || !hoverPt) return null;
      const anchorsAll = segmentEndpointAnchors(segments);
      let start = snapPointToSketchGeometry(currentPath[0], segments);
      let end = { ...hoverPt };
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last.length >= 2) {
          const A = last[0];
          const B = last[1];
          const continuesChain = dist(start, B) <= LAYOUT_CHAIN_ALIGN_FT;
          if (continuesChain) {
            const d = deflectionAtVertexDeg(A, B, end);
            if (d <= LAYOUT_STRAIGHT_MAX_DEG) {
              end = snapEndColinearWithPrev(A, B, end);
            }
          }
        }
      }
      const endAnchors = anchorsAll.filter((a) => dist(a, start) > 0.06);
      end = snapPointToSketchGeometry(end, segments, { vertexAnchors: endAnchors });
      return { start, end };
    }, [currentPath, hoverPt, segments]);

    const segmentsRef = useRef(segments);
    segmentsRef.current = segments;

    function buildData(
      segs: { x: number; y: number }[][],
      lengths: string[],
      gates: PlacedGate[],
      joints: SketchJointTermination[]
    ) {
      const segLengths: { length_ft: number }[] = [];
      let total = 0;
      const flatPts: { x: number; y: number }[] = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.length >= 2) {
          const typed = parseFloat(lengths[i] || '');
          const ft =
            Number.isFinite(typed) && typed > 0
              ? typed
              : manualLengths
                ? 0
                : dist(seg[0], seg[1]);
          segLengths.push({ length_ft: Math.round(ft * 100) / 100 });
          total += ft;
          flatPts.push(seg[0], seg[1]);
        }
      }
      const singleCount = gates.filter((g) => g.type === 'single').length;
      const doubleCount = gates.filter((g) => g.type === 'double').length;
      const gateList = [
        ...(singleCount > 0 ? [{ type: 'single' as const, quantity: singleCount }] : []),
        ...(doubleCount > 0 ? [{ type: 'double' as const, quantity: doubleCount }] : []),
      ];
      const gate_placements: LayoutGatePlacement[] = gates.map((g) => ({
        type: g.type,
        line_index:
          segs.length > 0 ? Math.max(0, Math.min(segs.length - 1, g.line_index)) : 0,
        x: g.x,
        y: g.y,
        ...(g.width_in != null && g.width_in > 0 ? { width_in: g.width_in } : {}),
        ...(g.left_ft != null && Number.isFinite(g.left_ft) ? { left_ft: g.left_ft } : {}),
      }));
      const nums = lengthNumsForAlign(segs, lengths);
      const al = alignChainedSketchSegments(segs, nums, LAYOUT_CHAIN_ALIGN_FT, LAYOUT_MIN_SKETCH_SEGMENT_FT);
      const base = {
        points: flatPts,
        segments: segLengths,
        gates: gateList,
        gate_placements,
        total_length_ft: Math.round(total * 100) / 100,
      };
      if (joints.length > 0 && al.length > 0 && joints.length === jointPositionsFromAligned(al, LAYOUT_CHAIN_ALIGN_FT).length) {
        return {
          ...base,
          joint_terminations: joints.map((j) => ({ h_post: j.h_post, u_channel: j.u_channel })),
        };
      }
      return base;
    }

    const placedGatesRef = useRef(placedGates);
    placedGatesRef.current = placedGates;

    const notify = useCallback(() => {
      const d = buildData(
        segmentsRef.current,
        lineLengthsRef.current,
        placedGatesRef.current,
        jointTerminationsRef.current
      );
      onDrawingChange?.(d);
    }, [onDrawingChange]);

    const lineLengthsRef = useRef(lineLengths);
    lineLengthsRef.current = lineLengths;

    const jointTerminationsRef = useRef(jointTerminations);
    jointTerminationsRef.current = jointTerminations;

    useEffect(() => {
      const m = segments.length;
      if (m === 0) {
        setJointTerminations([]);
        return;
      }
      const nums = lengthNumsForAlign(segments, lineLengths);
      const al = alignChainedSketchSegments(segments, nums, LAYOUT_CHAIN_ALIGN_FT, LAYOUT_MIN_SKETCH_SEGMENT_FT);
      const gatePlacements = placedGates.map((g) => ({
        type: g.type,
        line_index: g.line_index,
      }));
      const def = defaultJointTerminationsFromAligned(al);
      if (def.length === 0) {
        setJointTerminations([]);
        return;
      }
      setJointTerminations((prev) => {
        if (prev.length === 0) return def.map((d) => ({ ...d }));
        // New geometry can turn an existing joint into a corner (e.g. a new line starting at an
        // older line's end) — OR in the recomputed auto U so those corners aren't missed.
        const merged = def.map((d, i) => {
          const p = prev[i];
          if (!p) return { ...d };
          return { h_post: p.h_post, u_channel: p.u_channel || d.u_channel };
        });
        if (
          merged.length === prev.length &&
          merged.every((m, i) => m.h_post === prev[i].h_post && m.u_channel === prev[i].u_channel)
        ) {
          return prev;
        }
        return merged;
      });
    }, [segments, lineLengths, placedGates]);

    /** Once a line length is entered, split any gate that was waiting (keeps click position, sizes gate from length). */
    useEffect(() => {
      for (const gate of placedGates) {
        if (gate.left_ft != null) continue;
        const segIdx = gate.line_index;
        const typed = parseFloat(lineLengths[segIdx] || '');
        if (!Number.isFinite(typed) || typed <= 0) continue;
        const result = applyInlineGateSplit(
          segments,
          lineLengths,
          placedGates,
          segIdx,
          gate.type,
          { x: gate.x, y: gate.y },
          typed,
          manualLengths
        );
        if (result) {
          setSegments(result.segments);
          setLineLengths(result.lineLengths);
          setPlacedGates(result.placedGates);
          return;
        }
      }
    }, [lineLengths, placedGates, segments, manualLengths]);

    useEffect(() => {
      setSelectedJointIndex((j) => (j != null && j >= jointTerminations.length ? null : j));
    }, [jointTerminations.length]);

    useEffect(() => {
      const gp = initialDrawing?.gate_placements;
      if (!gp?.length) return;
      setPlacedGates((prev) => {
        if (prev.length !== gp.length) return prev;
        let changed = false;
        const next = prev.map((g, i) => {
          const w = Number(gp[i]?.width_in);
          const width_in = Number.isFinite(w) && w > 0 ? w : undefined;
          if (g.width_in === width_in) return g;
          changed = true;
          return { ...g, width_in };
        });
        return changed ? next : prev;
      });
    }, [initialDrawing?.gate_placements]);

    useEffect(() => {
      const t = setTimeout(notify, 100);
      return () => clearTimeout(t);
    }, [segments, lineLengths, placedGates, jointTerminations, notify]);

    const totalFeet = segments.reduce((acc, seg, i) => {
      if (seg.length < 2) return acc;
      const typed = parseFloat(lineLengths[i] || '');
      const ft =
        Number.isFinite(typed) && typed > 0 ? typed : manualLengths ? 0 : dist(seg[0], seg[1]);
      return acc + ft;
    }, 0);

    const missingLengthCount = manualLengths
      ? segments.reduce((acc, seg, i) => {
          if (seg.length < 2) return acc;
          const typed = parseFloat(lineLengths[i] || '');
          return acc + (Number.isFinite(typed) && typed > 0 ? 0 : 1);
        }, 0)
      : 0;

    const jointVerts = useMemo(
      () => alignedFootVertices(segments, lineLengths),
      [segments, lineLengths]
    );

    const jointMarkersReady =
      jointVerts.length > 0 && jointVerts.length === jointTerminations.length;

    useImperativeHandle(ref, () => ({
      appendSegmentByLength(lengthFt: number) {
        const segs = segmentsRef.current;
        let start: { x: number; y: number };
        if (segs.length >= 1 && segs[segs.length - 1].length >= 2) {
          start = segs[segs.length - 1][1];
        } else {
          start = { x: 0, y: 0 };
        }
        const end = { x: start.x + lengthFt, y: start.y };
        setSegments((prev) => [...prev, [start, end]]);
        setLineLengths((prev) => [...prev, lengthFt.toFixed(1)]);
      },
    }), []);

    function clientToFeet(clientX: number, clientY: number): { x: number; y: number } {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    }

    function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = clientToFeet(e.clientX, e.clientY);
      pointerDownPos.current = pt;
      pointerDownPan.current = { ...pan };
      pointerDownTime.current = Date.now();
      isPanning.current = false;
    }

    function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
      const pt = clientToFeet(e.clientX, e.clientY);

      if (mode === 'place_single_gate' || mode === 'place_double_gate' || mode === 'assign_line_ends') {
        return;
      }

      if (pointerDownPos.current) {
        const d = dist(pointerDownPos.current, pt);
        // Pan only when not placing the end of a line (two-click draw).
        if (currentPath.length === 0) {
          if (!isPanning.current && d > 2) {
            isPanning.current = true;
          }
          if (isPanning.current) {
            const dx = pt.x - pointerDownPos.current.x;
            const dy = pt.y - pointerDownPos.current.y;
            setPan({
              x: pointerDownPan.current.x + dx,
              y: pointerDownPan.current.y + dy,
            });
          }
        }
      } else if (currentPath.length > 0) {
        setHoverPt(pt);
      }
    }

    function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
      if (pointerDownPos.current) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        const pt = clientToFeet(e.clientX, e.clientY);
        const d = dist(pointerDownPos.current, pt);
        const time = Date.now() - pointerDownTime.current;

        if (!isPanning.current && d < 2 && time < 500 && !readOnly) {
          handleClickInternal(pt);
        }

        pointerDownPos.current = null;
        isPanning.current = false;
      }
    }

    function handleClickInternal(pt: { x: number; y: number }) {
      if (readOnly) return;
      const { x, y } = pt;

      if (mode === 'assign_line_ends') {
        const verts = alignedFootVertices(segments, lineLengths);
        let bestI = -1;
        let bestD = JOINT_HIT_FT;
        for (let j = 0; j < verts.length; j++) {
          const d = dist(pt, verts[j]);
          if (d < bestD) {
            bestD = d;
            bestI = j;
          }
        }
        if (bestI >= 0) setSelectedJointIndex(bestI);
        return;
      }

      if (mode === 'place_single_gate' || mode === 'place_double_gate') {
        let hit: { segIdx: number; point: { x: number; y: number }; d: number } | null = null;
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          if (seg.length < 2) continue;
          const d = pointToSegmentDist(pt, seg[0], seg[1]);
          if (d < HIT_THRESHOLD && (!hit || d < hit.d)) {
            hit = { segIdx: i, point: nearestPointOnSegment(pt, seg[0], seg[1]), d };
          }
        }
        const hitGate = hit;
        if (hitGate) {
          const segIdx = hitGate.segIdx;
          const seg = segments[segIdx];
          if (seg && seg.length >= 2) {
            const gateType = mode === 'place_double_gate' ? 'double' : 'single';
            const typed = parseFloat(lineLengths[segIdx] || '');
            const hasTypedLength = Number.isFinite(typed) && typed > 0;
            const center = hitGate.point;

            if (hasTypedLength) {
              const result = applyInlineGateSplit(
                segments,
                lineLengths,
                placedGates,
                segIdx,
                gateType,
                center,
                typed,
                manualLengths
              );
              if (result) {
                setSegments(result.segments);
                setLineLengths(result.lineLengths);
                setPlacedGates(result.placedGates);
                setMode('draw');
                return;
              }
            }

            setPlacedGates((prev) => [
              ...prev,
              {
                type: gateType,
                x: center.x,
                y: center.y,
                line_index: segIdx,
                awaiting_length: !hasTypedLength,
              },
            ]);
          }
          setMode('draw');
        }
        return;
      }

      if (currentPath.length === 0) {
        let p = { x, y };
        if (segments.length > 0) {
          p = snapPointToSketchGeometry(p, segments);
        }
        setCurrentPath([p]);
      } else {
        const anchorsAll = segmentEndpointAnchors(segments);
        let start = snapPointToSketchGeometry(currentPath[0], segments);
        let end = { x, y };
        if (segments.length > 0) {
          const last = segments[segments.length - 1];
          if (last.length >= 2) {
            const A = last[0];
            const B = last[1];
            const continuesChain = dist(start, B) <= LAYOUT_CHAIN_ALIGN_FT;
            if (continuesChain) {
              const d = deflectionAtVertexDeg(A, B, end);
              if (d <= LAYOUT_STRAIGHT_MAX_DEG) {
                end = snapEndColinearWithPrev(A, B, end);
              }
            }
          }
        }
        const endAnchors = anchorsAll.filter((a) => dist(a, start) > 0.06);
        end = snapPointToSketchGeometry(end, segments, { vertexAnchors: endAnchors });
        if (dist(start, end) < MIN_DRAW_SEGMENT_FT) {
          setHoverPt(null);
          return;
        }
        setSegments((prev) => [...prev, [start, end]]);
        setLineLengths((prev) => [...prev, '']);
        setCurrentPath([]);
      }
      setHoverPt(null);
    }

    function finishLineAt(hover: { x: number; y: number } | null) {
      if (currentPath.length !== 1 || !hover) return;
      const anchorsAll = segmentEndpointAnchors(segments);
      let start = snapPointToSketchGeometry(currentPath[0], segments);
      let end = { ...hover };
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last.length >= 2) {
          const A = last[0];
          const B = last[1];
          const continuesChain = dist(start, B) <= LAYOUT_CHAIN_ALIGN_FT;
          if (continuesChain) {
            const d = deflectionAtVertexDeg(A, B, end);
            if (d <= LAYOUT_STRAIGHT_MAX_DEG) {
              end = snapEndColinearWithPrev(A, B, end);
            }
          }
        }
      }
      const endAnchors = anchorsAll.filter((a) => dist(a, start) > 0.06);
      end = snapPointToSketchGeometry(end, segments, { vertexAnchors: endAnchors });
      if (dist(start, end) < MIN_DRAW_SEGMENT_FT) {
        setHoverPt(null);
        return;
      }
      setSegments((prev) => [...prev, [start, end]]);
      setLineLengths((prev) => [...prev, '']);
      setCurrentPath([]);
      setHoverPt(null);
    }

    function cancelCurrentLine() {
      setCurrentPath([]);
      setHoverPt(null);
    }

    useEffect(() => {
      function onKey(ev: KeyboardEvent) {
        if (readOnly) return;
        if (ev.key === 'Escape') {
          if (selectedJointIndex != null) {
            ev.preventDefault();
            setSelectedJointIndex(null);
            return;
          }
          if (mode === 'assign_line_ends') {
            ev.preventDefault();
            setMode('draw');
            return;
          }
          if (mode === 'place_single_gate' || mode === 'place_double_gate') {
            ev.preventDefault();
            setMode('draw');
            return;
          }
          cancelCurrentLine();
        }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [readOnly, mode, selectedJointIndex]);

    function undo() {
      if (currentPath.length === 1) {
        setCurrentPath([]);
        setHoverPt(null);
      } else if (segments.length > 0) {
        const removedIdx = segments.length - 1;
        const newSegs = segments.slice(0, -1);
        setSegments(newSegs);
        setLineLengths((prev) => prev.slice(0, -1));
        setPlacedGates((prev) => adjustPlacedGatesAfterSegmentRemoved(prev, removedIdx));
      }
    }

    function confirmDeleteSegment(segmentIndex: number) {
      if (readOnly) return;
      if (segmentIndex < 0 || segmentIndex >= segments.length) return;
      const ok = window.confirm(
        'Are you sure you want to delete this line?\n\nClick OK (Yes) to remove it from the sketch, or Cancel to keep it.'
      );
      if (!ok) return;

      const willBeEmpty = segments.length <= 1;
      const newSegs = segments.filter((_, j) => j !== segmentIndex);
      setSegments(newSegs);
      setLineLengths((prev) => prev.filter((_, j) => j !== segmentIndex));
      if (willBeEmpty) {
        setPlacedGates([]);
      } else {
        setPlacedGates((prev) => adjustPlacedGatesAfterSegmentRemoved(prev, segmentIndex));
      }
    }

    function reset() {
      setSegments([]);
      setLineLengths([]);
      setJointTerminations([]);
      setSelectedJointIndex(null);
      setPlacedGates([]);
      setCurrentPath([]);
      setHoverPt(null);
      setMode('draw');
      onReset?.();
    }

    const [mapAspect, setMapAspect] = useState(1.35);

    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const update = () => {
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) setMapAspect(r.width / r.height);
      };
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const mapView = useMemo(() => {
      // Fixed visible span driven only by the manual zoom level — it does NOT grow or
      // shrink with the drawing's bounds, so the canvas no longer auto zooms in/out as
      // you draw. Panning/zooming is fully under the user's control.
      const ar = mapAspect > 0.25 ? mapAspect : 1;
      let vw = BASE_VIEW_FT / zoom;
      let vh = BASE_VIEW_FT / zoom;
      if (vw / vh > ar) vh = vw / ar;
      else vw = vh * ar;
      // Content center is still useful for pushing length labels to the outside.
      const raw = boundsFromSketch(segments, placedGates, currentPath, previewDraw);
      let contentCx = 0;
      let contentCy = 0;
      if (raw) {
        const b0 = normalizeBoundsSpan(raw);
        contentCx = (b0.minX + b0.maxX) / 2;
        contentCy = (b0.minY + b0.maxY) / 2;
      }
      return {
        viewBox: `${-vw / 2 - pan.x} ${-vh / 2 - pan.y} ${vw} ${vh}`,
        vw,
        vh,
        contentCx,
        contentCy,
      };
    }, [segments, placedGates, currentPath, previewDraw, pan.x, pan.y, zoom, mapAspect]);

    const viewBox = mapView.viewBox;

    const markerScale = useMemo(() => {
      const span = viewSpanFt(mapView.vw, mapView.vh);
      return {
        gateR: Math.max(2.4, span * 0.024),
        gateRDouble: Math.max(3.4, span * 0.03),
        gateFont: Math.max(2.2, span * 0.02),
        gateFontDouble: Math.max(2.8, span * 0.024),
        gateStroke: Math.max(0.4, span * 0.0045),
        jointR: Math.max(2.8, span * 0.028),
        jointRSelected: Math.max(3.6, span * 0.034),
        jointFont: Math.max(2.5, span * 0.022),
        jointFontSelected: Math.max(3.1, span * 0.027),
        jointStroke: Math.max(0.45, span * 0.005),
        jointTextStroke: Math.max(0.25, span * 0.0035),
        gateSpanStroke: Math.max(0.55, span * 0.0065),
      };
    }, [mapView.vw, mapView.vh]);

    const gateSpanPlacements = useMemo(() => {
      const segMeta = segments.map((seg, si) => ({
        length_ft: segmentLengthFtForGate(seg, lineLengths[si] || '', manualLengths),
      }));
      const out: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
      for (let i = 0; i < placedGates.length; i++) {
        const g = placedGates[i];
        const idx = Math.max(0, Math.min(segments.length - 1, g.line_index));
        const seg = segments[idx];
        if (!seg || seg.length < 2) continue;
        const typedLen = segMeta[idx]?.length_ft ?? 0;
        const geomLen = dist(seg[0], seg[1]);
        const segmentLengthFt = typedLen > 0 ? typedLen : geomLen;
        if (segmentLengthFt <= 0) continue;
        const widthFt =
          sketchGateWidthInches(
            {
              type: g.type,
              line_index: idx,
              ...(g.width_in != null && g.width_in > 0 ? { width_in: g.width_in } : {}),
            },
            segMeta
          ) / 12;
        if (widthFt <= 0) continue;
        const ends = gateSpanAlongSegment(
          [seg[0], seg[1]],
          { x: g.x, y: g.y },
          widthFt,
          segmentLengthFt
        );
        if (ends) out.push({ ...ends, key: `gate-span-${i}` });
      }
      return out;
    }, [placedGates, segments, lineLengths, manualLengths]);

    /** Re-center and zoom so the whole drawing is in view (manual, on demand). */
    function fitView() {
      const next = fitViewForSketch(segments, placedGates);
      setZoom(next.zoom);
      setPan(next.pan);
    }

    /** Midpoint labels with collision separation (L / T junctions no longer stack). */
    const segmentLabelPlacements = useMemo(() => {
      const n = segments.length;
      if (n > 25) return [];

      type Lab = {
        si: number;
        x: number;
        y: number;
        ox: number;
        oy: number;
        r: number;
        text: string;
        fontSize: number;
        strokeW: number;
        maxDrift: number;
      };

      const share: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const ai = segments[i];
          const bj = segments[j];
          if (ai.length < 2 || bj.length < 2) continue;
          if (segmentsShareEndpoint(ai, bj)) {
            share[i][j] = true;
            share[j][i] = true;
          }
        }
      }

      const labs: Lab[] = [];
      const vw = mapView.vw;
      const vh = mapView.vh;
      const contentCx = mapView.contentCx;
      const contentCy = mapView.contentCy;

      const baseMaxDrift = Math.max(22, Math.min(vw, vh) * 0.12);

      for (let si = 0; si < n; si++) {
        const seg = segments[si];
        if (seg.length < 2) continue;
        const dx = seg[1].x - seg[0].x;
        const dy = seg[1].y - seg[0].y;
        const len = Math.hypot(dx, dy) || 1;
        if (n > 18 && len < 2) continue;

        let neighborBoost = 1;
        for (let oj = 0; oj < n; oj++) {
          if (oj === si) continue;
          const other = segments[oj];
          if (other.length < 2) continue;
          if (segmentsShareEndpoint(seg, other)) {
            neighborBoost = Math.max(neighborBoost, 1.32);
          }
        }

        const mx = (seg[0].x + seg[1].x) / 2;
        const my = (seg[0].y + seg[1].y) / 2;
        let perpX = -dy / len;
        let perpY = dx / len;
        const towardCx = mx - contentCx;
        const towardCy = my - contentCy;
        if (perpX * towardCx + perpY * towardCy < 0) {
          perpX = -perpX;
          perpY = -perpY;
        }
        const gatePlacementsForLabel = placedGates.map((g) => ({
          type: g.type,
          line_index: g.line_index,
        }));
        const netLen = segmentLengthFtForGate(seg, lineLengths[si] || '', manualLengths);
        const baseLabel = sketchSegmentRunLabel(si, n, netLen, gatePlacementsForLabel);
        const lenStr = lineLengths[si]?.trim();
        const labelText = lenStr ? `${baseLabel} · ${lenStr} ft` : baseLabel;
        /** Scale with sketch size — large enough to read at a glance on customer/layout previews. */
        const labelFontFt = Math.max(2.35, Math.min(vw, vh) * 0.032);
        const estHalfW = labelText.length * labelFontFt * 0.36;
        const perpOffset =
          Math.max(len * 0.048 + 0.65, estHalfW * 0.82 + 1.25, 4.75) * neighborBoost;
        const px = mx + perpX * perpOffset;
        const py = my + perpY * perpOffset;
        const r = Math.max(estHalfW * 0.92, labelFontFt * 0.68, 3.75);
        const strokeW = Math.max(0.2, labelFontFt * 0.42);
        const inlineGateSplit = segmentInInlineGateSplit(si, n, placedGates);
        const maxDrift = inlineGateSplit
          ? Math.min(baseMaxDrift, Math.max(2.5, len * 1.15))
          : baseMaxDrift;
        labs.push({
          si,
          x: px,
          y: py,
          ox: px,
          oy: py,
          r,
          text: labelText,
          fontSize: labelFontFt,
          strokeW,
          maxDrift,
        });
      }

      const repelPasses = (passes: number) => {
        for (let pass = 0; pass < passes; pass++) {
          for (let i = 0; i < labs.length; i++) {
            for (let j = i + 1; j < labs.length; j++) {
              const a = labs[i];
              const b = labs[j];
              const distAB = Math.hypot(b.x - a.x, b.y - a.y);
              const gapExtra = share[a.si][b.si] ? 2.9 : 1.35;
              const need = a.r + b.r + gapExtra;
              if (distAB >= need) continue;
              let nx = b.x - a.x;
              let ny = b.y - a.y;
              const dlen = Math.hypot(nx, ny);
              if (dlen < 1e-5) {
                const ang = ((i * 2.391 + j * 1.127) % 6.283185307179586) || 0.37;
                nx = Math.cos(ang);
                ny = Math.sin(ang);
              } else {
                nx /= dlen;
                ny /= dlen;
              }
              const push = (need - distAB) * 0.52;
              a.x -= nx * push;
              a.y -= ny * push;
              b.x += nx * push;
              b.y += ny * push;
            }
          }
        }
      };

      const clampDrift = () => {
        for (const L of labs) {
          const ddc = Math.hypot(L.x - L.ox, L.y - L.oy);
          if (ddc > L.maxDrift) {
            const t = L.maxDrift / ddc;
            L.x = L.ox + (L.x - L.ox) * t;
            L.y = L.oy + (L.y - L.oy) * t;
          }
        }
      };

      repelPasses(18);
      clampDrift();
      repelPasses(10);
      clampDrift();

      return labs;
    }, [segments, lineLengths, placedGates, mapView]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const dy = normalizeWheelDeltaY(e);
        let logStep = -dy * WHEEL_ZOOM_LOG_SENS;
        logStep = Math.max(-WHEEL_ZOOM_MAX_LOG_STEP, Math.min(WHEEL_ZOOM_MAX_LOG_STEP, logStep));
        const factor = Math.exp(logStep);
        setZoom((z) => Math.min(3, Math.max(0.25, z * factor)));
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }, []);

  return (
    <div
      ref={fsRootRef}
      className={`flex min-h-0 w-full flex-col ${isFullscreen ? 'h-full bg-slate-50 p-3' : fillParent ? 'h-full' : 'h-auto'}`}
    >
      {!readOnly && (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            {isFullscreen
              ? 'Press Esc or use the button to exit fullscreen.'
              : 'Tip: use Fullscreen, or double-click the whiteboard when no line is in progress.'}
          </span>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${
          isFullscreen
            ? 'min-h-[200px] flex-1'
            : fillParent
              ? 'min-h-[200px] flex-1'
              : 'h-[min(520px,62vh)] min-h-[260px] w-full flex-shrink-0'
        }`}
        style={{
          touchAction: 'none',
        }}
        onDoubleClick={
          readOnly
            ? undefined
            : (e) => {
                if (currentPath.length === 0 && mode === 'draw') {
                  e.preventDefault();
                  void toggleFullscreen();
                }
              }
        }
      >
          <svg
            ref={svgRef}
            className={`absolute inset-0 h-full w-full ${readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair touch-none'}`}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Whiteboard Origin Marker */}
            <circle cx={0} cy={0} r={1.25} fill="#cbd5e1" />

            {segments.map((seg, si) =>
              seg.length >= 2 ? (
                <g key={si}>
                  <line
                    x1={seg[0].x}
                    y1={seg[0].y}
                    x2={seg[1].x}
                    y2={seg[1].y}
                    stroke={strokeForLineMode(lineHighlightModes?.[si])}
                    strokeWidth={lineHighlightModes?.[si] && lineHighlightModes[si] !== 'none' ? 1.55 : 1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0px 0.5px 0.5px rgba(0,0,0,0.08))' }}
                  />
                  {seg.map((p, pi) => (
                    <circle
                      key={pi}
                      cx={p.x}
                      cy={p.y}
                      r={1.35}
                      fill={strokeForLineMode(lineHighlightModes?.[si])}
                    />
                  ))}
                </g>
              ) : null
            )}

            {segmentLabelPlacements.map((pl) => (
              <text
                key={`line-label-${pl.si}`}
                x={pl.x}
                y={pl.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0f172a"
                fontSize={pl.fontSize}
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth={pl.strokeW}
                strokeLinejoin="round"
              >
                {pl.text}
              </text>
            ))}

            {currentPath.length > 0 && (
              <circle cx={currentPath[0].x} cy={currentPath[0].y} r={1.75} fill="#ef4444" />
            )}

            {previewDraw && (
              <line
                x1={previewDraw.start.x}
                y1={previewDraw.start.y}
                x2={previewDraw.end.x}
                y2={previewDraw.end.y}
                stroke="#1e293b"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
            )}

            {gateSpanPlacements.map((sp) => (
              <line
                key={sp.key}
                x1={sp.x1}
                y1={sp.y1}
                x2={sp.x2}
                y2={sp.y2}
                stroke="#22c55e"
                strokeWidth={markerScale.gateSpanStroke * 2.2}
                strokeLinecap="round"
                opacity={0.92}
                style={{ filter: 'drop-shadow(0px 0px 0.4px rgba(21,128,61,0.35))' }}
              />
            ))}

            {placedGates.map((g, i) => {
              const isDouble = g.type === 'double';
              const r = isDouble ? markerScale.gateRDouble : markerScale.gateR;
              const label = isDouble ? 'D' : 'S';
              const fontSize = isDouble ? markerScale.gateFontDouble : markerScale.gateFont;
              return (
                <g key={i}>
                  <circle
                    cx={g.x}
                    cy={g.y}
                    r={r}
                    fill="#2563eb"
                    stroke="#fff"
                    strokeWidth={markerScale.gateStroke}
                  />
                  <text
                    x={g.x}
                    y={g.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={fontSize}
                    fontWeight="800"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    paintOrder="stroke"
                    stroke="#1d4ed8"
                    strokeWidth={Math.max(0.15, fontSize * 0.12)}
                    style={{ userSelect: 'none' }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {jointMarkersReady &&
              jointVerts.map((v, ji) => {
                const cap = jointTerminations[ji];
                const selected = mode === 'assign_line_ends' && selectedJointIndex === ji;
                const r = selected ? markerScale.jointRSelected : markerScale.jointR;
                const tag =
                  !cap.h_post && !cap.u_channel ? '—' : `${cap.h_post ? 'H' : ''}${cap.u_channel ? 'U' : ''}`;
                const fontSize = selected ? markerScale.jointFontSelected : markerScale.jointFont;
                return (
                  <g key={`joint-cap-${ji}`}>
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r={r}
                      fill={selected ? '#ede9fe' : 'rgba(255,255,255,0.95)'}
                      stroke={selected ? '#6d28d9' : '#64748b'}
                      strokeWidth={selected ? markerScale.jointStroke * 1.35 : markerScale.jointStroke}
                      style={{ pointerEvents: 'none' }}
                    />
                    <text
                      x={v.x}
                      y={v.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={selected ? '#5b21b6' : '#0f172a'}
                      fontSize={fontSize}
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth={markerScale.jointTextStroke}
                      strokeLinejoin="round"
                      style={{ userSelect: 'none' }}
                    >
                      {tag}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {!readOnly && (
        <>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onReset && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Reset all
            </button>
          )}
          <button
            type="button"
            onClick={() => finishLineAt(hoverPt)}
            disabled={currentPath.length !== 1 || !hoverPt || mode !== 'draw'}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            End line
          </button>
          <button
            type="button"
            onClick={cancelCurrentLine}
            disabled={currentPath.length !== 1 || mode !== 'draw'}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel line (Esc)
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'place_single_gate' ? 'draw' : 'place_single_gate'))}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              mode === 'place_single_gate'
                ? 'border-green-600 bg-green-100 text-green-900'
                : 'border-green-200 bg-white text-green-800 hover:bg-green-50'
            }`}
          >
            Single gate
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'place_double_gate' ? 'draw' : 'place_double_gate'))}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              mode === 'place_double_gate'
                ? 'border-sky-600 bg-sky-100 text-sky-900'
                : 'border-sky-200 bg-white text-sky-800 hover:bg-sky-50'
            }`}
          >
            Double gate
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode === 'assign_line_ends') {
                setMode('draw');
              } else {
                setCurrentPath([]);
                setHoverPt(null);
                setMode('assign_line_ends');
              }
            }}
            disabled={segments.length === 0}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === 'assign_line_ends'
                ? 'border-violet-600 bg-violet-100 text-violet-900'
                : 'border-violet-200 bg-white text-violet-900 hover:bg-violet-50'
            }`}
          >
            Line ends (PVC)
          </button>
          <button
            type="button"
            onClick={undo}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Undo
          </button>
          <span className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-bold">
            Total: {totalFeet.toFixed(1)} ft
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-sm font-bold hover:bg-slate-50"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-sm font-bold hover:bg-slate-50"
            >
              −
            </button>
            <span className="text-xs text-[var(--muted)]">Zoom</span>
            <button
              type="button"
              onClick={fitView}
              disabled={segments.length === 0 && placedGates.length === 0}
              className="ml-1 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              title="Center and fit the drawing in view"
            >
              Fit
            </button>
          </div>
        </div>
        {!readOnly && segments.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-sm bg-slate-800" />
              Unassigned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-sm bg-green-600" />
              Private (one homeowner)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-sm bg-red-600" />
              Shared (2+ homeowners)
            </span>
          </div>
        )}
        {segments.length > 0 && (
          <div className="mt-3 space-y-3">
            {manualLengths && missingLengthCount > 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Enter the measured length for {missingLengthCount === 1 ? 'the highlighted line' : `each of the ${missingLengthCount} highlighted lines`} below — lengths are not taken
                from the drawing.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-medium text-[var(--muted)]">Lengths (ft):</span>
              {segments.length <= 40 ? segments.map((_, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base">
                    {sketchSegmentRunLabel(
                      i,
                      segments.length,
                      segmentLengthFtForGate(segments[i], lineLengths[i] || '', manualLengths),
                      placedGates.map((g) => ({ type: g.type, line_index: g.line_index }))
                    )}
                    :
                  </span>
                  <input
                    type="text"
                    value={lineLengths[i] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLineLengths((prev) => {
                        const next = [...prev];
                        next[i] = v;
                        return next;
                      });
                    }}
                    placeholder="ft"
                    className={`w-[4.5rem] rounded border px-2 py-1.5 text-base ${
                      manualLengths && !(parseFloat(lineLengths[i] || '') > 0)
                        ? 'border-amber-400 bg-amber-50/60'
                        : 'border-[var(--line)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => confirmDeleteSegment(i)}
                    className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )) : (
                <span className="text-sm text-[var(--muted)] italic">Too many lines to edit individually. Use Undo to redraw, or see total above.</span>
              )}
            </div>
            {!readOnly &&
              selectedJointIndex != null &&
              jointTerminations[selectedJointIndex] &&
              jointMarkersReady && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 text-sm text-slate-800">
                  <div className="font-semibold text-slate-900">
                    Vertex {selectedJointIndex + 1} of {jointVerts.length}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Each point is an open end or corner along the fence (after the same chain snap used for PVC). The
                    end of drawn line <em>i</em> uses vertex <em>i + 1</em> for H-post (D6) and U-channel (D7). You can
                    enable both, one, or neither.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={jointTerminations[selectedJointIndex].h_post}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const i = selectedJointIndex;
                          if (i == null) return;
                          setJointTerminations((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, h_post: checked } : p))
                          );
                        }}
                      />
                      H-post (D6)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={jointTerminations[selectedJointIndex].u_channel}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const i = selectedJointIndex;
                          if (i == null) return;
                          setJointTerminations((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, u_channel: checked } : p))
                          );
                        }}
                      />
                      U-channel (D7)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedJointIndex(null)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}
        {mode === 'place_single_gate' && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--muted)]">
              Click on a line to place a single gate (blue S). If the line is longer than the gate, it splits into
              left fence, gate run, and right fence — each labeled below. If the line is only a gate opening, it stays
              one merged run. Press Esc or Cancel to exit.
            </p>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel gate placement
            </button>
          </div>
        )}
        {mode === 'place_double_gate' && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--muted)]">
              Click on a line to place a double gate (blue D). Long lines split into fence + Run N Gate + fence; a
              gate-only line stays merged as one run. Press Esc or Cancel to exit.
            </p>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel gate placement
            </button>
          </div>
        )}
        {mode === 'assign_line_ends' && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--muted)]">
              Click a numbered vertex (H = H-post, U = U-channel). Toggle each corner or open end for PVC line ends
              (Excel D6 / D7). Press Esc to exit.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedJointIndex(null);
                setMode('draw');
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        )}
        {mode === 'draw' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">1</span>
              Click to start a line
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">2</span>
              Click again to end, or use <strong className="text-slate-700">End line</strong> (snaps to nearby corners
              within 6 ft; within {LAYOUT_STRAIGHT_MAX_DEG}° of straight snaps colinear — sharper turns get a corner
              post + U-channel)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">Esc</span>
              Cancel the line in progress
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">Pan</span>
              Drag on empty canvas (no line started) to pan
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-violet-200 text-[8px]">PVC</span>
              Use <strong className="text-slate-700">Line ends (PVC)</strong> to set H-post and U-channel at each corner or open end
            </span>
          </div>
        )}
        </>
        )}
        {readOnly && segments.length > 0 && (
          <div className="mt-2 text-sm font-medium text-[var(--muted)]">Total: {totalFeet.toFixed(1)} ft</div>
        )}
      </div>
    );
  }
);
