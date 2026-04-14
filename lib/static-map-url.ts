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
 * Google Static Maps URL with satellite imagery and a high-contrast fence path.
 * Uses explicit center + zoom (tighter than path-only auto framing) and a dark outline under a bright line.
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

  // Thick dark “stroke” then bright yellow on top (drawn in declaration order)
  const outlinePath = `color:0x0f172a|weight:18|${points}`;
  const linePath = `color:0xffea00|weight:10|${points}`;

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

  // Multiple path= entries (outline under, highlight on top)
  const base = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  return `${base}&path=${encodeURIComponent(outlinePath)}&path=${encodeURIComponent(linePath)}`;
}

export function canBuildFenceStaticMap(segments: FenceMapSegment[]): boolean {
  return segments.length >= 1;
}
