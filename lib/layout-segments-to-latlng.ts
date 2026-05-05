/**
 * Turn layout line lengths (feet) into short lat/lng polylines with distinct bearings
 * so map-based heuristics (e.g. auto side assignment) can tell lines apart.
 * Billable length_ft on each row is preserved from the layout tool.
 */
export function segmentsFromLayoutLengthsFeet(
  lengthsFt: number[],
  refLat: number,
  refLng: number
): { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft: number }[] {
  if (lengthsFt.length === 0) return [];
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  const ftToM = 0.3048;
  let lat = refLat;
  let lng = refLng;
  const out: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft: number }[] = [];
  for (let i = 0; i < lengthsFt.length; i++) {
    const ft = lengthsFt[i];
    const m = ft * ftToM;
    const deg = (i * 137.508) % 360;
    const rad = (deg * Math.PI) / 180;
    const dNorthM = m * Math.cos(rad);
    const dEastM = m * Math.sin(rad);
    const dLat = dNorthM / mPerDegLat;
    const dLng = dEastM / mPerDegLng;
    const elat = lat + dLat;
    const elng = lng + dLng;
    out.push({
      start_lat: lat,
      start_lng: lng,
      end_lat: elat,
      end_lng: elng,
      length_ft: ft,
    });
    lat = elat;
    lng = elng;
  }
  return out;
}
