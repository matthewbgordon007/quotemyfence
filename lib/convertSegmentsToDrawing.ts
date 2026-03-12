/**
 * Convert map segments (lat/lng) to layout canvas format (x,y in feet).
 * Same logic used by layout page when loading from customer - ensures identical display.
 */
export type ApiSegment = { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number };

export function convertSegmentsToDrawing(
  segments: ApiSegment[],
  totalLengthFt: number,
  gates: { gate_type: string; quantity: number }[]
): {
  points: { x: number; y: number }[];
  segments: { length_ft: number }[];
  gates: { type: 'single' | 'double'; quantity: number }[];
  total_length_ft: number;
} {
  if (segments.length === 0) {
    return {
      points: [],
      segments: [],
      gates: gates.map((g) => ({ type: g.gate_type as 'single' | 'double', quantity: g.quantity || 0 })),
      total_length_ft: totalLengthFt,
    };
  }
  const METERS_PER_DEG_LAT = 111320;
  const refLat = Number(segments[0].start_lat);
  const refLng = Number(segments[0].start_lng);
  const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  const M_TO_FT = 3.28084;

  function toFeet(lat: number, lng: number): { x: number; y: number } {
    const dx = (lng - refLng) * metersPerDegLng;
    const dy = (lat - refLat) * METERS_PER_DEG_LAT;
    return { x: dx * M_TO_FT, y: -dy * M_TO_FT };
  }

  const points: { x: number; y: number }[] = [];
  const segLengths: { length_ft: number }[] = [];
  for (const seg of segments) {
    if (points.length === 0) {
      points.push(toFeet(Number(seg.start_lat), Number(seg.start_lng)));
    }
    points.push(toFeet(Number(seg.end_lat), Number(seg.end_lng)));
    if (seg.length_ft != null) {
      segLengths.push({ length_ft: Number(seg.length_ft) });
    }
  }
  const total = totalLengthFt > 0 ? totalLengthFt : segLengths.reduce((s, x) => s + x.length_ft, 0);
  return {
    points,
    segments: segLengths.length > 0 ? segLengths : points.length >= 2 ? [{ length_ft: total }] : [],
    gates: gates.map((g) => ({ type: g.gate_type as 'single' | 'double', quantity: g.quantity || 0 })),
    total_length_ft: total,
  };
}
