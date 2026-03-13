'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

// Canvas uses feet as coordinate system. Origin at center.
// Scale: pixels per foot for display
const PX_PER_FT = 8;

export interface LayoutDrawCanvasRef {
  appendSegmentByLength: (lengthFt: number) => void;
}

export interface LayoutDrawCanvasProps {
  initialDrawing?: {
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft: number;
  } | null;
  /** When true, fit view to drawing and hide editing controls */
  readOnly?: boolean;
  onDrawingChange?: (data: {
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
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

export const LayoutDrawCanvas = forwardRef<LayoutDrawCanvasRef, LayoutDrawCanvasProps>(
  function LayoutDrawCanvas({ initialDrawing, readOnly, onDrawingChange, onReset }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    // Each segment is exactly one line: [start, end]
    const [segments, setSegments] = useState<{ x: number; y: number }[][]>(() => {
      const pts = initialDrawing?.points ?? [];
      const segLens = initialDrawing?.segments ?? [];
      if (pts.length < 2) return [];
      const out: { x: number; y: number }[][] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        out.push([pts[i], pts[i + 1]]);
      }
      return out;
    });
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    const lastClickTime = useRef(0);
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
    const pointerDownPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const pointerDownTime = useRef(0);
    const isPanning = useRef(false);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [placedGates, setPlacedGates] = useState<{ type: 'single' | 'double'; x: number; y: number }[]>(() => {
      const gates = initialDrawing?.gates ?? [];
      const pts = initialDrawing?.points ?? [];
      const result: { type: 'single' | 'double'; x: number; y: number }[] = [];
      const anchor = pts.length >= 1 ? pts[pts.length - 1] : { x: 0, y: 0 };
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
      if (pts.length < 2) return [];
      const n = pts.length - 1;
      return Array.from({ length: n }, (_, i) => {
        if (segLens[i]?.length_ft != null) return String(segLens[i].length_ft);
        const a = pts[i];
        const b = pts[i + 1];
        return a && b ? dist(a, b).toFixed(1) : '';
      });
    });
    const [zoom, setZoom] = useState(1);
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
      return {
        points: flatPts,
        segments: segLengths,
        gates: gateList,
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
      } else {
        if (currentPath.length > 0) {
          setHoverPt(pt);
        }
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

      const now = Date.now();
      if (now - lastClickTime.current < 350) {
        lastClickTime.current = 0;
        setCurrentPath([]);
        setHoverPt(null);
        return;
      }
      lastClickTime.current = now;

      if (currentPath.length === 0) {
        setCurrentPath([{ x, y }]);
      } else {
        const last = currentPath[currentPath.length - 1];
        setSegments((prev) => [...prev, [last, { x, y }]]);
        setLineLengths((prev) => [...prev, '']);
        setCurrentPath((prev) => [...prev, { x, y }]);
      }
      setHoverPt(null);
    }

    function undo() {
      if (currentPath.length > 1) {
        setCurrentPath((prev) => prev.slice(0, -1));
        setSegments((prev) => prev.slice(0, -1));
        setLineLengths((prev) => prev.slice(0, -1));
      } else if (currentPath.length === 1) {
        setCurrentPath([]);
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
                    stroke="#1e293b"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}
                  />
                  {seg.map((p, pi) => (
                    <circle key={pi} cx={p.x} cy={p.y} r={1.5} fill="#1e293b" />
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

            {hoverPt && currentPath.length > 0 && (
              <line
                x1={currentPath[currentPath.length - 1].x}
                y1={currentPath[currentPath.length - 1].y}
                x2={hoverPt.x}
                y2={hoverPt.y}
                stroke="#1e293b"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
            )}

            {placedGates.map((g, i) => (
              <circle
                key={i}
                cx={g.x}
                cy={g.y}
                r={g.type === 'double' ? 4 : 3}
                fill={g.type === 'double' ? '#0ea5e9' : '#22c55e'}
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
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
            onClick={undo}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setMode('place_single_gate')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              mode === 'place_single_gate' ? 'border-green-500 bg-green-100' : 'border-[var(--line)] bg-white hover:bg-slate-50'
            }`}
          >
            + Single gate
          </button>
          <button
            type="button"
            onClick={() => setMode('place_double_gate')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              mode === 'place_double_gate' ? 'border-blue-500 bg-blue-100' : 'border-[var(--line)] bg-white hover:bg-slate-50'
            }`}
          >
            + Double gate
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
          <p className="mt-2 text-sm text-[var(--muted)]">Click on a line to place a single gate</p>
        )}
        {mode === 'place_double_gate' && (
          <p className="mt-2 text-sm text-[var(--muted)]">Click on a line to place a double gate</p>
        )}
        {mode === 'draw' && (
          <div className="mt-2 text-sm text-[var(--muted)] flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-flex items-center justify-center text-[8px]">1</span> Click to start line</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-flex items-center justify-center text-[8px]">2</span> Click to end line</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-flex items-center justify-center text-[8px]">3</span> Double-click to start new section</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-flex items-center justify-center text-[8px]">4</span> Click and drag to move around</span>
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
