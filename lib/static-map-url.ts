/** Lat/lng fence segments as stored in `fence_segments` (ordered polyline). */
export type FenceMapSegment = {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  length_ft?: number;
};

/** Coerce Supabase rows (nullable length_ft) into map/PDF-friendly segments */
export function normalizeFenceMapSegments(
  rows: Array<{
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    length_ft?: number | null;
  }>
): FenceMapSegment[] {
  return rows.map((r) => ({
    start_lat: Number(r.start_lat),
    start_lng: Number(r.start_lng),
    end_lat: Number(r.end_lat),
    end_lng: Number(r.end_lng),
    ...(r.length_ft != null && Number.isFinite(Number(r.length_ft))
      ? { length_ft: Number(r.length_ft) }
      : {}),
  }));
}

function pathPointString(segments: FenceMapSegment[]): string {
  const parts: string[] = [];
  segments.forEach((seg, i) => {
    if (i === 0) parts.push(`${seg.start_lat},${seg.start_lng}`);
    parts.push(`${seg.end_lat},${seg.end_lng}`);
  });
  return parts.join('|');
}

/** Mercator latitude helper (same as common Maps zoom-from-bounds snippets) */
function latRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
}

function zoomForAxis(mapPx: number, worldPx: number, worldFraction: number): number {
  return Math.log2(mapPx / worldPx / Math.max(worldFraction, 1e-10));
}

/**
 * Zoom level so the bounds fill most of the map (tighter than path-only auto-fit).
 * `zoomBoost` nudges inward so backyard-scale drawings aren’t shown neighborhood-wide.
 */
function computeTightZoom(
  north: number,
  south: number,
  east: number,
  west: number,
  mapWidthPx: number,
  mapHeightPx: number,
  opts?: { zoomBoost?: number; minZoom?: number; maxZoom?: number }
): number {
  const WORLD = 256;
  const ZOOM_MAX = opts?.maxZoom ?? 20;
  const ZOOM_MIN = opts?.minZoom ?? 14;
  const boost = opts?.zoomBoost ?? 2;

  const latFraction = (latRad(north) - latRad(south)) / Math.PI;
  let lngDiff = east - west;
  if (lngDiff < 0) lngDiff += 360;
  const lngFraction = lngDiff / 360;

  const zLat = zoomForAxis(mapHeightPx, WORLD, latFraction);
  const zLng = zoomForAxis(mapWidthPx, WORLD, lngFraction);
  let z = Math.min(zLat, zLng, ZOOM_MAX);
  z = Math.floor(z) + boost;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

function boundsFromSegments(segments: FenceMapSegment[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  segments.forEach((seg, i) => {
    if (i === 0) {
      minLat = Math.min(minLat, seg.start_lat);
      maxLat = Math.max(maxLat, seg.start_lat);
      minLng = Math.min(minLng, seg.start_lng);
      maxLng = Math.max(maxLng, seg.start_lng);
    }
    minLat = Math.min(minLat, seg.end_lat);
    maxLat = Math.max(maxLat, seg.end_lat);
    minLng = Math.min(minLng, seg.end_lng);
    maxLng = Math.max(maxLng, seg.end_lng);
  });
  return { minLat, maxLat, minLng, maxLng };
}

/** Avoid degenerate bounds (two very close points → absurd zoom) */
function expandBoundsWithMinSize(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): { south: number; north: number; west: number; east: number } {
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  // ~12 m latitude span minimum so zoom caps behave well for small yards
  const minDLat = 0.00011;
  let dLat = maxLat - minLat;
  if (dLat < minDLat) {
    const half = minDLat / 2;
    minLat = midLat - half;
    maxLat = midLat + half;
    dLat = minDLat;
  }
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const minDLng = minDLat / Math.max(cosLat, 0.25);
  let dLng = maxLng - minLng;
  if (dLng < minDLng) {
    const half = minDLng / 2;
    minLng = midLng - half;
    maxLng = midLng + half;
    dLng = minDLng;
  }
  return { south: minLat, north: maxLat, west: minLng, east: maxLng };
}

function padBounds(
  south: number,
  north: number,
  west: number,
  east: number,
  paddingRatio: number
): { south: number; north: number; west: number; east: number } {
  const latPad = (north - south) * paddingRatio;
  const lngPad = (east - west) * paddingRatio;
  return {
    south: south - latPad,
    north: north + latPad,
    west: west - lngPad,
    east: east + lngPad,
  };
}

/**
 * Maps Static API allows one marker label character: 0–9, A–Z.
 * Lines 1–9 → digits; 10–35 → A–Z; beyond → *.
 */
function segmentMarkerLabel(lineNumber: number): string {
  if (lineNumber >= 1 && lineNumber <= 9) return String(lineNumber);
  if (lineNumber >= 10 && lineNumber <= 35) return String.fromCharCode(55 + lineNumber);
  return '*';
}

function segmentMidpoints(segments: FenceMapSegment[]): { lat: number; lng: number }[] {
  return segments.map((seg) => ({
    lat: (seg.start_lat + seg.end_lat) / 2,
    lng: (seg.start_lng + seg.end_lng) / 2,
  }));
}

/**
 * Google Static Maps URL with satellite imagery, golden-yellow fence path, and tiny
 * numbered markers at each segment midpoint (line 1, 2, …; 10+ shows as A–Z per API).
 */
export function buildFenceStaticMapUrl(
  segments: FenceMapSegment[],
  apiKey: string,
  options?: { width?: number; height?: number }
): string {
  if (segments.length === 0) return '';
  const w = options?.width ?? 640;
  const h = options?.height ?? 400;
  const points = pathPointString(segments);
  // Warm amber-gold (less neon than pure yellow), solid, modest stroke for satellite
  const pathSpec = `color:0xe8c547ff|weight:6|${points}`;

  const raw = boundsFromSegments(segments);
  const sized = expandBoundsWithMinSize(raw.minLat, raw.maxLat, raw.minLng, raw.maxLng);
  const { south, north, west, east } = padBounds(sized.south, sized.north, sized.west, sized.east, 0.08);

  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const zoom = computeTightZoom(north, south, east, west, w, h, {
    zoomBoost: 3,
    minZoom: 13,
    maxZoom: 20,
  });

  const params = new URLSearchParams({
    size: `${w}x${h}`,
    scale: '2',
    maptype: 'satellite',
    center: `${centerLat},${centerLng}`,
    zoom: String(zoom),
    key: apiKey,
  });

  let url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&path=${encodeURIComponent(pathSpec)}`;

  const mids = segmentMidpoints(segments);
  mids.forEach((mid, i) => {
    const label = segmentMarkerLabel(i + 1);
    const lat = mid.lat.toFixed(6);
    const lng = mid.lng.toFixed(6);
    // tiny pin + circular label chip; dark fill reads on satellite
    const marker = `size:tiny|color:0x334155|label:${label}|${lat},${lng}`;
    url += `&markers=${encodeURIComponent(marker)}`;
  });

  return url;
}

export function canBuildFenceStaticMap(segments: FenceMapSegment[]): boolean {
  return segments.length >= 1;
}
