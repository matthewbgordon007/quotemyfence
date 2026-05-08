/**
 * PVC fence material take-off: configurable panel BOM + heuristic H-post / U-channel counts.
 */

import { planarCornerAnalysis, type PlanarDrawingInput } from '@/lib/layout-drawing-planar';

export interface PvcPanelLineItem {
  /** Stable id for row keys */
  id: string;
  name: string;
  quantity_per_panel: number;
}

export interface PvcFenceMaterialProfileV1 {
  version: 1;
  panel_width_ft: number;
  /** Turning angle larger than this (degrees) counts as structural corner needing U-channel handling. */
  corner_angle_threshold_deg: number;
  /** Names shown on BOM lines for inferred structural pieces (qty only; not multiplied by panels). */
  h_post_display_name: string;
  u_channel_display_name: string;
  panel_items: PvcPanelLineItem[];
}

export const DEFAULT_PVC_PROFILE: PvcFenceMaterialProfileV1 = {
  version: 1,
  panel_width_ft: 6,
  corner_angle_threshold_deg: 15,
  h_post_display_name: 'H-post (est.)',
  u_channel_display_name: 'U-channel (est.)',
  panel_items: [
    { id: 'panels', name: 'Full panel sections', quantity_per_panel: 1 },
    { id: 'rails', name: 'Horizontal rails', quantity_per_panel: 2 },
  ],
};

export function clampPanelWidth(ft: unknown): number {
  const n = Number(ft);
  if (!Number.isFinite(n)) return DEFAULT_PVC_PROFILE.panel_width_ft;
  return Math.min(120, Math.max(0.5, Math.round(n * 1000) / 1000));
}

export function clampThreshold(deg: unknown): number {
  const n = Number(deg);
  if (!Number.isFinite(n)) return DEFAULT_PVC_PROFILE.corner_angle_threshold_deg;
  return Math.min(179, Math.max(0, Math.round(n * 100) / 100));
}

/** Normalize arbitrary JSON into a valid profile object. */
export function normalizePvcFenceMaterialProfile(raw: unknown): PvcFenceMaterialProfileV1 {
  const base = DEFAULT_PVC_PROFILE;
  if (!raw || typeof raw !== 'object') return { ...base, panel_items: [...base.panel_items] };
  const o = raw as Record<string, unknown>;
  const version = Number(o.version) === 1 ? 1 : 1;
  const panel_width_ft = clampPanelWidth(o.panel_width_ft);
  const corner_angle_threshold_deg = clampThreshold(o.corner_angle_threshold_deg);
  const h_post_display_name =
    typeof o.h_post_display_name === 'string' && o.h_post_display_name.trim()
      ? o.h_post_display_name.trim()
      : base.h_post_display_name;
  const u_channel_display_name =
    typeof o.u_channel_display_name === 'string' && o.u_channel_display_name.trim()
      ? o.u_channel_display_name.trim()
      : base.u_channel_display_name;
  const pi = Array.isArray(o.panel_items) ? o.panel_items : [];

  const panel_items: PvcPanelLineItem[] = pi.map((row, i) => {
    const r = row as Record<string, unknown>;
    const idRaw = typeof r.id === 'string' ? r.id.trim() : '';
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const q = Number(r.quantity_per_panel);
    const quantity_per_panel = Number.isFinite(q) && q >= 0 ? Math.round(q * 10000) / 10000 : 0;
    return {
      id: idRaw || `item_${i + 1}`,
      name: name || `Item ${i + 1}`,
      quantity_per_panel,
    };
  });

  return {
    version,
    panel_width_ft,
    corner_angle_threshold_deg,
    h_post_display_name,
    u_channel_display_name,
    panel_items: panel_items.length > 0 ? panel_items : [...base.panel_items],
  };
}

/** Segments aligned with calculator / layout imports (north-up local plane approximation). */
export type LatLngSeg = {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  length_ft?: number;
};

const D2R = Math.PI / 180;
const EPS_LL = 1e-8;

function toXY(lat: number, lng: number, refLat: number, refLng: number): { x: number; y: number } {
  const mLat = 111320;
  const mLng = 111320 * Math.cos(lat * D2R);
  return {
    x: (lng - refLng) * mLng,
    y: (lat - refLat) * mLat,
  };
}

function norm(dx: number, dy: number): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < EPS_LL) return null;
  return { x: dx / len, y: dy / len };
}

/** Turning angle between two consecutive runs A→B and B→C (degrees); 0 = straight continuation at B. */
export function turnAngleDegreesAtMiddle(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
  latC: number,
  lngC: number
): number {
  const refLat = latB;
  const refLng = lngB;
  const a = toXY(latA, lngA, refLat, refLng);
  const b = toXY(latB, lngB, refLat, refLng);
  const c = toXY(latC, lngC, refLat, refLng);

  const d1 = norm(b.x - a.x, b.y - a.y); // oriented along first leg toward vertex
  const d2 = norm(c.x - b.x, c.y - b.y); // second leg outbound from vertex
  if (!d1 || !d2) return 180;

  const dot = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y));
  const rad = Math.acos(dot);
  return Math.round((((rad * 180) / Math.PI) + Number.EPSILON) * 100) / 100;
}

/**
 * Sequential segments assumed to describe one continuous route in order:
 * junction i is between segments[i].end ≈ segments[i+1].start.
 */
export function countStructuralCorners(
  segments: LatLngSeg[],
  thresholdDeg: number
): { corners: number; anglesDeg: number[] } {
  if (segments.length < 2) return { corners: 0, anglesDeg: [] };
  const thresh = clampThreshold(thresholdDeg);
  const anglesDeg: number[] = [];
  let corners = 0;

  const close = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): boolean => Math.abs(lat1 - lat2) < 1e-5 && Math.abs(lng1 - lng2) < 1e-5;

  for (let i = 0; i < segments.length - 1; i++) {
    const ab = segments[i];
    const bc = segments[i + 1];
    if (!close(ab.end_lat, ab.end_lng, bc.start_lat, bc.start_lng)) continue;

    const turn = turnAngleDegreesAtMiddle(
      ab.start_lat,
      ab.start_lng,
      ab.end_lat,
      ab.end_lng,
      bc.end_lat,
      bc.end_lng
    );
    anglesDeg.push(turn);
    if (turn > thresh && Math.abs(turn - 180) > thresh) corners += 1;
  }

  return { corners, anglesDeg };
}

export function panelsOnLine(lengthFt: number, panelWidthFt: number): number {
  const L = Math.max(0, Number(lengthFt) || 0);
  const W = clampPanelWidth(panelWidthFt);
  if (L <= 0) return 0;
  return Math.ceil(L / W);
}

/**
 * Rough H-post heuristic: bays along polyline minus shared junctions minus corners resolved with U-slot.
 */
export function estimateHPosts(
  lineLengthsFt: number[],
  panelWidthFt: number,
  structuralCorners: number
): number {
  const W = clampPanelWidth(panelWidthFt);
  let sumEnds = 0;
  for (const Lraw of lineLengthsFt) {
    const L = Math.max(0, Number(Lraw) || 0);
    const nPanels = panelsOnLine(L, W);
    if (nPanels <= 0 && L <= 0) continue;
    const bays = Math.max(1, nPanels);
    sumEnds += bays + 1;
  }
  const lines = Math.max(0, lineLengthsFt.filter((x) => (Number(x) || 0) > 0).length);
  const sharedJoints = lines > 1 ? lines - 1 : 0;
  let est = Math.max(0, sumEnds - sharedJoints - structuralCorners);
  return Math.max(0, Math.round(est));
}

export interface PvcEstimateLineBreakdown {
  index: number;
  length_ft: number;
  panel_count: number;
}

export interface PvcEstimateResult {
  profile: PvcFenceMaterialProfileV1;
  line_breakdown: PvcEstimateLineBreakdown[];
  total_panels_on_lines: number;
  structural_corners: number;
  turn_angles_deg: number[];
  u_channels_est: number;
  h_posts_est: number;
  bom_rows: { name: string; quantity: number; note?: string }[];
  /** Which input produced `structural_corners` / angles. */
  corner_detection: 'manual' | 'layout_planar' | 'map_segments' | 'none';
}

export function estimatePvcMaterial(args: {
  profile: PvcFenceMaterialProfileV1;
  line_lengths_ft: number[];
  /** Map / homeowner drawing with trustworthy lat-lng junctions */
  map_segments_latlng?: LatLngSeg[] | null;
  /** Contractor layout planner x,y footprint (recommended for bends). */
  layout_planar?: PlanarDrawingInput | null;
  manual_structural_corners?: number | null;
}): PvcEstimateResult {
  const profile = normalizePvcFenceMaterialProfile(args.profile);
  const lengths = args.line_lengths_ft.map((x) => Math.max(0, Number(x) || 0));

  let structuralCorners = 0;
  let turnAnglesDeg: number[] = [];
  let corner_detection: PvcEstimateResult['corner_detection'] = 'none';

  const manual = args.manual_structural_corners;
  if (manual != null && Number.isFinite(manual) && manual >= 0) {
    structuralCorners = Math.floor(manual);
    corner_detection = 'manual';
  } else {
    const layoutPl = args.layout_planar;
    if (layoutPl?.points?.length && layoutPl.points.length >= 2) {
      const pc = planarCornerAnalysis(layoutPl, profile.corner_angle_threshold_deg);
      structuralCorners = pc.corners;
      turnAnglesDeg = pc.anglesDeg;
      corner_detection = 'layout_planar';
    } else {
      const mapSegs = args.map_segments_latlng;
      if (mapSegs && mapSegs.length >= 2) {
        const c = countStructuralCorners(mapSegs, profile.corner_angle_threshold_deg);
        structuralCorners = c.corners;
        turnAnglesDeg = c.anglesDeg;
        corner_detection = 'map_segments';
      }
    }
  }

  const breakdown: PvcEstimateLineBreakdown[] = lengths.map((L, i) => ({
    index: i,
    length_ft: L,
    panel_count: L > 0 ? panelsOnLine(L, profile.panel_width_ft) : 0,
  }));
  const totalPanels = breakdown.reduce((a, x) => a + x.panel_count, 0);

  const uChannelsEst = structuralCorners;
  const hPostsEst = estimateHPosts(lengths, profile.panel_width_ft, structuralCorners);

  const bomRows: PvcEstimateResult['bom_rows'] = [];
  for (const pi of profile.panel_items) {
    const qty = totalPanels * Math.max(0, pi.quantity_per_panel);
    if (qty <= 0) continue;
    bomRows.push({ name: pi.name, quantity: Math.ceil(qty * 10000) / 10000 });
  }

  bomRows.push({
    name: profile.h_post_display_name,
    quantity: hPostsEst,
    note:
      lengths.filter((x) => x > 0).length < 2
        ? undefined
        : 'Rough count from bays, shared joints and corners — verify in the field.',
  });

  const uNote =
    corner_detection === 'manual'
      ? 'Uses your manual structural corner count.'
      : corner_detection === 'layout_planar'
        ? 'From bend angles in your saved Draw layout footprint.'
        : corner_detection === 'map_segments'
          ? 'From GPS / map segment bend angles.'
          : lengths.filter((x) => x > 0).length >= 2
            ? 'Load a Draw layout or set structural corners manually to estimate U-channel at direction changes.'
            : undefined;

  bomRows.push({
    name: profile.u_channel_display_name,
    quantity: uChannelsEst,
    note: uNote,
  });

  return {
    profile,
    line_breakdown: breakdown,
    total_panels_on_lines: Math.round(totalPanels * 1000) / 1000,
    structural_corners: structuralCorners,
    turn_angles_deg: turnAnglesDeg,
    u_channels_est: uChannelsEst,
    h_posts_est: hPostsEst,
    bom_rows: bomRows,
    corner_detection,
  };
}
