'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  deflectionAtVertexDeg,
  LAYOUT_SNAP_VERTEX_FT,
  LAYOUT_STRAIGHT_MAX_DEG,
  layoutPointsToSegmentPairs,
  snapEndColinearWithPrev,
  snapPointToAnchorIfClose,
} from '@/lib/layout-sketch-to-pvc-inputs';

// Canvas uses feet as coordinate system. Origin at center.
// Scale: pixels per foot for display
const PX_PER_FT = 8;

export interface LayoutDrawCanvasRef {
  appendSegmentByLength: (lengthFt: number) => void;
}

export type LineHighlightMode = 'none' | 'private' | 'shared';

export type LayoutGatePlacement = { type: 'single' | 'double'; line_index: number };

export interface LayoutDrawCanvasProps {
  initialDrawing?: {
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft: number;
    /** Nearest line index per placed gate (export / calculator). */
    gate_placements?: LayoutGatePlacement[];
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
  }) => void;
  onReset?: () => void;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
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

function strokeForLineMode(mode: LineHighlightMode | undefined): string {
  if (mode === 'private') return '#16a34a';
  if (mode === 'shared') return '#dc2626';
  return '#1e293b';
}

export const LayoutDrawCanvas = forwardRef<LayoutDrawCanvasRef, LayoutDrawCanvasProps>(
  function LayoutDrawCanvas({ initialDrawing, readOnly, lineHighlightModes, onDrawingChange, onReset }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
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
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [placedGates, setPlacedGates] = useState<{ type: 'single' | 'double'; x: number; y: number }[]>(() => {
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
            return {
              type: t,
              x: (seg[0].x + seg[1].x) / 2,
              y: (seg[0].y + seg[1].y) / 2,
            };
          }
          return { type: t, x: 0, y: 0 };
        });
      }
      const result: { type: 'single' | 'double'; x: number; y: number }[] = [];
      const anchor =
        initSegs.length > 0 && initSegs[initSegs.length - 1].length >= 2
          ? initSegs[initSegs.length - 1][1]
          : pts.length >= 1
            ? pts[pts.length - 1]
            : { x: 0, y: 0 };
      let i = 0;
      for (const g of gates) {
        for (let q = 0; q < (g.quantity || 0); q++) {
          result.push({
            type: g.type as 'single' | 'double',
            x: anchor.x + 2 * (i % 3),
            y: anchor.y + 2 * Math.floor(i / 3),
          });
          i++;
        }
      }
      return result;
    });
    const [mode, setMode] = useState<'draw' | 'place_single_gate' | 'place_double_gate'>('draw');
    const HIT_THRESHOLD = 8;
    const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null);
    const [lineLengths, setLineLengths] = useState<string[]>(() => {
      const pts = initialDrawing?.points ?? [];
      const segLens = initialDrawing?.segments ?? [];
      const initSegs = layoutPointsToSegmentPairs(pts, segLens);
      const n = initSegs.length;
      if (n === 0) return [];
      return Array.from({ length: n }, (_, i) => {
        if (segLens[i]?.length_ft != null) return String(segLens[i].length_ft);
        const seg = initSegs[i];
        if (seg.length < 2) return '';
        return dist(seg[0], seg[1]).toFixed(1);
      });
    });
    const [zoom, setZoom] = useState(1);

    const previewDraw = useMemo(() => {
      if (currentPath.length !== 1 || !hoverPt) return null;
      let start = currentPath[0];
      let end = { ...hoverPt };
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last.length >= 2) {
          const A = last[0];
          const B = last[1];
          start = snapPointToAnchorIfClose(start, B, LAYOUT_SNAP_VERTEX_FT);
          const d = deflectionAtVertexDeg(A, B, end);
          if (d <= LAYOUT_STRAIGHT_MAX_DEG) {
            end = snapEndColinearWithPrev(A, B, end);
          }
        }
      }
      return { start, end };
    }, [currentPath, hoverPt, segments]);

    const segmentsRef = useRef(segments);
    segmentsRef.current = segments;

    function buildData(
      segs: { x: number; y: number }[][],
      lengths: string[],
      gates: { type: 'single' | 'double'; x: number; y: number }[]
    ) {
      const segLengths: { length_ft: number }[] = [];
      let total = 0;
      const flatPts: { x: number; y: number }[] = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.length >= 2) {
          const typed = parseFloat(lengths[i] || '');
          const ft = Number.isFinite(typed) && typed > 0 ? typed : dist(seg[0], seg[1]);
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
        line_index: nearestLineIndexForPoint({ x: g.x, y: g.y }, segs),
      }));
      return {
        points: flatPts,
        segments: segLengths,
        gates: gateList,
        gate_placements,
        total_length_ft: Math.round(total * 100) / 100,
      };
    }

    const placedGatesRef = useRef(placedGates);
    placedGatesRef.current = placedGates;

    const notify = useCallback(() => {
      const d = buildData(segmentsRef.current, lineLengthsRef.current, placedGatesRef.current);
      onDrawingChange?.(d);
    }, [onDrawingChange]);

    const lineLengthsRef = useRef(lineLengths);
    lineLengthsRef.current = lineLengths;

    useEffect(() => {
      const t = setTimeout(notify, 100);
      return () => clearTimeout(t);
    }, [segments, lineLengths, placedGates, notify]);

    const totalFeet = segments.reduce((acc, seg, i) => {
      if (seg.length < 2) return acc;
      const typed = parseFloat(lineLengths[i] || '');
      const ft = Number.isFinite(typed) && typed > 0 ? typed : dist(seg[0], seg[1]);
      return acc + ft;
    }, 0);

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

      if (mode === 'place_single_gate' || mode === 'place_double_gate') {
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

        if (!isPanning.current && d < 2 && time < 500) {
          handleClickInternal(pt);
        }

        pointerDownPos.current = null;
        isPanning.current = false;
      }
    }

    function handleClickInternal(pt: { x: number; y: number }) {
      const { x, y } = pt;

      if (mode === 'place_single_gate' || mode === 'place_double_gate') {
        let best: { segIdx: number; point: { x: number; y: number }; d: number } | null = null;
        segments.forEach((seg, i) => {
          if (seg.length < 2) return;
          const d = pointToSegmentDist(pt, seg[0], seg[1]);
          if (d < HIT_THRESHOLD && (!best || d < best.d)) {
            best = { segIdx: i, point: nearestPointOnSegment(pt, seg[0], seg[1]), d };
          }
        });
        if (best) {
          setPlacedGates((prev) => [...prev, { type: mode === 'place_double_gate' ? 'double' : 'single', x: best!.point.x, y: best!.point.y }]);
          setMode('draw');
        }
        return;
      }

      if (currentPath.length === 0) {
        let p = { x, y };
        if (segments.length > 0) {
          const last = segments[segments.length - 1];
          if (last.length >= 2) {
            p = snapPointToAnchorIfClose(p, last[1], LAYOUT_SNAP_VERTEX_FT);
          }
        }
        setCurrentPath([p]);
      } else {
        let start = currentPath[0];
        let end = { x, y };
        if (segments.length > 0) {
          const last = segments[segments.length - 1];
          if (last.length >= 2) {
            const A = last[0];
            const B = last[1];
            start = snapPointToAnchorIfClose(start, B, LAYOUT_SNAP_VERTEX_FT);
            const d = deflectionAtVertexDeg(A, B, end);
            if (d <= LAYOUT_STRAIGHT_MAX_DEG) {
              end = snapEndColinearWithPrev(A, B, end);
            }
          }
        }
        setSegments((prev) => [...prev, [start, end]]);
        setLineLengths((prev) => [...prev, '']);
        setCurrentPath([]);
      }
      setHoverPt(null);
    }

    function finishLineAt(hover: { x: number; y: number } | null) {
      if (currentPath.length !== 1 || !hover) return;
      let start = currentPath[0];
      let end = { ...hover };
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last.length >= 2) {
          const A = last[0];
          const B = last[1];
          start = snapPointToAnchorIfClose(start, B, LAYOUT_SNAP_VERTEX_FT);
          const d = deflectionAtVertexDeg(A, B, end);
          if (d <= LAYOUT_STRAIGHT_MAX_DEG) {
            end = snapEndColinearWithPrev(A, B, end);
          }
        }
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
          cancelCurrentLine();
        }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [readOnly]);

    function undo() {
      if (currentPath.length === 1) {
        setCurrentPath([]);
        setHoverPt(null);
      } else if (segments.length > 0) {
        setSegments((prev) => prev.slice(0, -1));
        setLineLengths((prev) => prev.slice(0, -1));
      }
    }

    function reset() {
      setSegments([]);
      setLineLengths([]);
      setPlacedGates([]);
      setCurrentPath([]);
      setHoverPt(null);
      setMode('draw');
      onReset?.();
    }

    const baseViewSize = 280;
    const viewSize = baseViewSize / zoom;
    const defaultViewBox = `${-viewSize / 2 - pan.x} ${-viewSize / 2 - pan.y} ${viewSize} ${viewSize}`;

    const fitViewBox = useMemo(() => {
      if (!readOnly || segments.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      segments.forEach((seg) => {
        seg.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
      });
      if (!Number.isFinite(minX)) return null;
      const pad = Math.max(20, (maxX - minX + maxY - minY) * 0.1);
      const w = Math.max(40, maxX - minX + pad * 2);
      const h = Math.max(40, maxY - minY + pad * 2);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
    }, [readOnly, segments]);
    const viewBox = fitViewBox ?? defaultViewBox;

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setZoom((z) => Math.min(3, Math.max(0.25, z + delta)));
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        style={{
          touchAction: 'none',
        }}
      >
          <svg
            ref={svgRef}
            className={`absolute inset-0 h-full w-full ${readOnly ? '' : 'cursor-crosshair touch-none'}`}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={readOnly ? undefined : handlePointerDown}
            onPointerMove={readOnly ? undefined : handlePointerMove}
            onPointerUp={readOnly ? undefined : handlePointerUp}
            onPointerCancel={readOnly ? undefined : handlePointerUp}
          >
            {/* Whiteboard Origin Marker */}
            <circle cx={0} cy={0} r={1.5} fill="#cbd5e1" />

            {segments.map((seg, si) =>
              seg.length >= 2 ? (
                <g key={si}>
                  <line
                    x1={seg[0].x}
                    y1={seg[0].y}
                    x2={seg[1].x}
                    y2={seg[1].y}
                    stroke={strokeForLineMode(lineHighlightModes?.[si])}
                    strokeWidth={lineHighlightModes?.[si] && lineHighlightModes[si] !== 'none' ? 2.25 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}
                  />
                  {seg.map((p, pi) => (
                    <circle
                      key={pi}
                      cx={p.x}
                      cy={p.y}
                      r={1.5}
                      fill={strokeForLineMode(lineHighlightModes?.[si])}
                    />
                  ))}
                  {segments.length <= 25 && (() => {
                    const mx = (seg[0].x + seg[1].x) / 2;
                    const my = (seg[0].y + seg[1].y) / 2;
                    const dx = seg[1].x - seg[0].x;
                    const dy = seg[1].y - seg[0].y;
                    const len = Math.hypot(dx, dy) || 1;
                    if (segments.length > 12 && len < 8) return null; // hide small segment text if drawing is rough
                    const offset = 12;
                    const px = mx + (-dy / len) * offset;
                    const py = my + (dx / len) * offset;
                    const labelText = lineLengths[si]?.trim()
                      ? `Line ${si + 1}: ${lineLengths[si].trim()} ft`
                      : `Line ${si + 1}`;
                    return (
                      <text
                        x={px}
                        y={py}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#0f172a"
                        fontSize={4}
                        fontWeight="600"
                        style={{ filter: 'drop-shadow(0px 1px 2px white)' }}
                      >
                        {labelText}
                      </text>
                    );
                  })()}
                </g>
              ) : null
            )}

            {currentPath.length > 0 && (
              <circle cx={currentPath[0].x} cy={currentPath[0].y} r={2} fill="#ef4444" />
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

            {placedGates.map((g, i) => {
              const isDouble = g.type === 'double';
              const r = isDouble ? 5.2 : 2.9;
              const label = isDouble ? 'D' : 'S';
              const fontSize = isDouble ? 5 : 3.25;
              return (
                <g key={i}>
                  <circle
                    cx={g.x}
                    cy={g.y}
                    r={r}
                    fill="#2563eb"
                    stroke="#fff"
                    strokeWidth={0.6}
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
                    style={{ userSelect: 'none' }}
                  >
                    {label}
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
            disabled={currentPath.length !== 1 || !hoverPt}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            End line
          </button>
          <button
            type="button"
            onClick={cancelCurrentLine}
            disabled={currentPath.length !== 1}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel line (Esc)
          </button>
          <button
            type="button"
            onClick={() => setMode('place_single_gate')}
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
            onClick={() => setMode('place_double_gate')}
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
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[var(--muted)]">Lengths (ft):</span>
              {segments.length <= 15 ? segments.map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-sm">Line {i + 1}:</span>
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
                    className="w-16 rounded border border-[var(--line)] px-2 py-1 text-sm"
                  />
                </div>
              )) : (
                <span className="text-sm text-[var(--muted)] italic">Too many lines to edit individually. Use Undo to redraw, or see total above.</span>
              )}
            </div>
          </div>
        )}
        {mode === 'place_single_gate' && (
          <p className="mt-2 text-sm text-[var(--muted)]">Click on a line to place a single gate (small blue circle with S).</p>
        )}
        {mode === 'place_double_gate' && (
          <p className="mt-2 text-sm text-[var(--muted)]">Click on a line to place a double gate (larger blue circle with D).</p>
        )}
        {mode === 'draw' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">1</span>
              Click to start a line
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">2</span>
              Click again to end, or use <strong className="text-slate-700">End line</strong> (snaps to prior end within 2
              ft; within 3° of straight snaps colinear)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">Esc</span>
              Cancel the line in progress
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gray-200 text-[8px]">Pan</span>
              Drag on empty canvas (no line started) to pan
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
