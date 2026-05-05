export type FenceMapSegment = {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  length_ft?: number;
};

const SIDE_KEYS = ['lhs_adj', 'lhs', 'back', 'rhs', 'rhs_adj'] as const;
export type CalculatorSideKey = (typeof SIDE_KEYS)[number];

function segmentLengthFt(s: FenceMapSegment): number {
  const t = Number(s.length_ft);
  if (Number.isFinite(t) && t > 0) return t;
  const R = 6371000;
  const lat1 = (s.start_lat * Math.PI) / 180;
  const lat2 = (s.end_lat * Math.PI) / 180;
  const dlat = lat2 - lat1;
  const dlng = ((s.end_lng - s.start_lng) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) * Math.sin(dlng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) * 3.28084;
}

/**
 * Best-effort map from drawn line index → calculator side keys (lhs_adj, lhs, back, rhs, rhs_adj).
 * - With `streetBearingDeg` (0=N, 90=E): line whose midpoint is **least** “toward the street” from the
 *   centroid is treated as **back** (yard side); others fill lhs_adj, lhs, rhs, rhs_adj by angle around centroid.
 * - Without street: **longest** line → **back**; same angular fill for the other four keys.
 */
export function suggestCalculatorSideLineIndices(
  segments: FenceMapSegment[],
  streetBearingDeg: number | null | undefined
): Partial<Record<CalculatorSideKey, number>> {
  const n = segments.length;
  if (n === 0) return {};

  const centroidLat =
    segments.reduce((a, s) => a + (s.start_lat + s.end_lat) / 2, 0) / n;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((centroidLat * Math.PI) / 180);
  const centroidLng = segments.reduce((a, s) => a + (s.start_lng + s.end_lng) / 2, 0) / n;

  type Row = { i: number; len: number; midLat: number; midLng: number; ang: number; streetScore: number };
  const rows: Row[] = segments.map((s, i) => {
    const midLat = (s.start_lat + s.end_lat) / 2;
    const midLng = (s.start_lng + s.end_lng) / 2;
    const ex = (midLng - centroidLng) * mPerDegLng;
    const ny = (midLat - centroidLat) * mPerDegLat;
    const ang = Math.atan2(ex, ny);
    return { i, len: segmentLengthFt(s), midLat, midLng, ang, streetScore: 0 };
  });

  const useStreet = streetBearingDeg != null && Number.isFinite(streetBearingDeg);
  let ux = 0;
  let uy = 0;
  if (useStreet) {
    const rad = (Number(streetBearingDeg) * Math.PI) / 180;
    ux = Math.sin(rad);
    uy = Math.cos(rad);
  }

  for (const r of rows) {
    const ex = (r.midLng - centroidLng) * mPerDegLng;
    const ny = (r.midLat - centroidLat) * mPerDegLat;
    r.streetScore = useStreet ? ex * ux + ny * uy : 0;
  }

  let backIdx = rows[0].i;
  for (const r of rows) {
    const cur = rows.find((x) => x.i === backIdx)!;
    if (useStreet) {
      if (r.streetScore < cur.streetScore) backIdx = r.i;
    } else if (r.len > cur.len) {
      backIdx = r.i;
    }
  }

  const others = rows
    .filter((r) => r.i !== backIdx)
    .sort((a, b) => a.ang - b.ang);

  const out: Partial<Record<CalculatorSideKey, number>> = { back: backIdx };
  const slots: CalculatorSideKey[] = ['lhs_adj', 'lhs', 'rhs', 'rhs_adj'];
  others.forEach((r, j) => {
    if (j < slots.length) out[slots[j]] = r.i;
  });
  return out;
}
