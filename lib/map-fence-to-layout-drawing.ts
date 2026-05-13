/**
 * Convert Google-Maps fence segments (lat/lng + optional length_ft) into plan-view
 * `layout_drawings.drawing_data` for the FMS material calculator / LayoutDrawCanvas.
 */
import { layoutPointsToSegmentPairs } from '@/lib/layout-sketch-to-pvc-inputs';

export type MapFenceSegment = {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  length_ft?: number | null;
};

export type MapFenceGate = {
  gate_type: string;
  quantity: number;
  lat?: number | null;
  lng?: number | null;
};

export type LayoutDrawingDataFromMap = {
  points: { x: number; y: number }[];
  segments: { length_ft: number }[];
  gates: { type: 'single' | 'double'; quantity: number }[];
  gate_placements: { type: 'single' | 'double'; line_index: number }[];
  total_length_ft: number;
};

function normalizeGateType(t: string): 'single' | 'double' {
  const s = String(t || '').toLowerCase();
  if (s.includes('double')) return 'double';
  return 'single';
}

function distPointToSegmentSq(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const v2 = vx * vx + vy * vy;
  if (v2 < 1e-12) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return dx * dx + dy * dy;
  }
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / v2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + t * vx;
  const y = a.y + t * vy;
  const dx = p.x - x;
  const dy = p.y - y;
  return dx * dx + dy * dy;
}

function nearestSegmentLineIndex(
  p: { x: number; y: number },
  pairs: { x: number; y: number }[][]
): number {
  let bestI = 0;
  let bestD = Infinity;
  pairs.forEach((seg, i) => {
    if (seg.length < 2) return;
    const d = distPointToSegmentSq(p, seg[0], seg[1]);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  });
  return bestI;
}

export function mapFenceSegmentsToLayoutDrawing(
  segments: MapFenceSegment[],
  totalLengthFt: number,
  gateRows: MapFenceGate[]
): LayoutDrawingDataFromMap {
  const gatesAgg: { type: 'single' | 'double'; quantity: number }[] = [];
  let singleQty = 0;
  let doubleQty = 0;
  for (const g of gateRows || []) {
    const q = Math.max(0, Math.floor(Number(g.quantity) || 0));
    if (q <= 0) continue;
    if (normalizeGateType(g.gate_type) === 'double') doubleQty += q;
    else singleQty += q;
  }
  if (singleQty > 0) gatesAgg.push({ type: 'single', quantity: singleQty });
  if (doubleQty > 0) gatesAgg.push({ type: 'double', quantity: doubleQty });

  if (!segments?.length) {
    return {
      points: [],
      segments: [],
      gates: gatesAgg,
      gate_placements: [],
      total_length_ft: totalLengthFt,
    };
  }

  const METERS_PER_DEG_LAT = 111320;
  const refLat = Number(segments[0].start_lat);
  const refLng = Number(segments[0].start_lng);
  const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  const M_TO_FT = 3.28084;

  function toFeet(lat: number, lng: number) {
    const dx = (lng - refLng) * metersPerDegLng;
    const dy = (lat - refLat) * METERS_PER_DEG_LAT;
    return { x: dx * M_TO_FT, y: -dy * M_TO_FT };
  }

  const points: { x: number; y: number }[] = [];
  const segLengths: { length_ft: number }[] = [];
  for (const seg of segments) {
    if (points.length === 0) points.push(toFeet(Number(seg.start_lat), Number(seg.start_lng)));
    points.push(toFeet(Number(seg.end_lat), Number(seg.end_lng)));
    if (seg.length_ft != null && Number.isFinite(Number(seg.length_ft))) {
      segLengths.push({ length_ft: Number(seg.length_ft) });
    }
  }
  const total =
    totalLengthFt > 0 ? totalLengthFt : segLengths.reduce((s, x) => s + x.length_ft, 0);

  const meta =
    segLengths.length > 0 ? segLengths : points.length >= 2 ? [{ length_ft: total }] : [];

  const gate_placements: { type: 'single' | 'double'; line_index: number }[] = [];
  if (meta.length > 0 && points.length >= 2) {
    const pairs = layoutPointsToSegmentPairs(points, meta);
    if (pairs.length > 0) {
      for (const row of gateRows || []) {
        const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
        if (qty <= 0) continue;
        const typ = normalizeGateType(row.gate_type);
        const lat = row.lat != null ? Number(row.lat) : NaN;
        const lng = row.lng != null ? Number(row.lng) : NaN;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const gPt = toFeet(lat, lng);
          const lineIdx = nearestSegmentLineIndex(gPt, pairs);
          for (let q = 0; q < qty; q++) {
            gate_placements.push({ type: typ, line_index: lineIdx });
          }
        }
      }
    }
  }

  return {
    points,
    segments: meta,
    gates: gatesAgg,
    gate_placements,
    total_length_ft: total,
  };
}
