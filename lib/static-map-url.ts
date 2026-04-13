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

/**
 * Google Static Maps URL with satellite imagery and a yellow path along the fence lines.
 * Email clients load this URL when rendering the message (same pattern as quote PDF).
 */
export function buildFenceStaticMapUrl(
  segments: FenceMapSegment[],
  apiKey: string,
  options?: { width?: number; height?: number }
): string {
  if (segments.length === 0) return '';
  const w = options?.width ?? 600;
  const h = options?.height ?? 350;
  const points: string[] = [];
  segments.forEach((seg, i) => {
    if (i === 0) points.push(`${seg.start_lat},${seg.start_lng}`);
    points.push(`${seg.end_lat},${seg.end_lng}`);
  });
  const path = `color:0xeab308|weight:6|${points.join('|')}`;
  return `https://maps.googleapis.com/maps/api/staticmap?size=${w}x${h}&scale=2&maptype=satellite&path=${encodeURIComponent(path)}&key=${encodeURIComponent(apiKey)}`;
}

export function canBuildFenceStaticMap(segments: FenceMapSegment[]): boolean {
  return segments.length >= 1;
}
