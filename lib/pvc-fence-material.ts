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

/** Equivalent panel bays for a run: linear ft ÷ nominal panel width (exact). */
export function panelBaysExact(lengthFt: number, panelWidthFt: number): number {
  const L = Math.max(0, Number(lengthFt) || 0);
  const W = clampPanelWidth(panelWidthFt);
  if (L <= 0 || W <= 0) return 0;
  return Math.round((L / W) * 100000) / 100000;
}

export function panelsOnLine(lengthFt: number, panelWidthFt: number): number {
  const L = Math.max(0, Number(lengthFt) || 0);
  const W = clampPanelWidth(panelWidthFt);
  if (L <= 0) return 0;
  return Math.ceil(L / W);
}

/** Full panel count (integer) + fractional remainder of the last incomplete bay (0–1). */
export function splitPanelBays(lengthFt: number, panelWidthFt: number): {
  bays_exact: number;
  full_panels: number;
  frac: number;
} {
  const W = clampPanelWidth(panelWidthFt);
  const bays_exact = panelBaysExact(lengthFt, W);
  if (bays_exact <= 0) return { bays_exact: 0, full_panels: 0, frac: 0 };
  const full_panels = Math.floor(bays_exact + 1e-9);
  const frac = Math.min(1, Math.max(0, Math.round((bays_exact - full_panels) * 100000) / 100000));
  return { bays_exact, full_panels, frac };
}

/** Rails: 2 per full panel bay; fractional last bay uses 1 rail if &lt; ½ panel (one cut for top+bottom), else 2. */
export function railsForRun(
  lengthFt: number,
  panelWidthFt: number,
  railsPerFullPanel: number
): number {
  const rpf = Math.max(0, Number(railsPerFullPanel) || 0);
  if (rpf <= 0) return 0;
  const { bays_exact, full_panels, frac } = splitPanelBays(lengthFt, panelWidthFt);
  if (bays_exact <= 0) return 0;
  let rails = full_panels * rpf;
  if (frac > 1e-6) {
    rails += frac < 0.5 ? 1 : rpf;
  }
  return rails;
}

/**
 * H-posts along sequential runs: each run would need ceil(L/W)+1 post positions;
 * merge shared endpoints between consecutive non-empty runs (one post per junction).
 * Corner posts at direction changes are included; pair with U-channel via structural_corners.
 */
export function estimateHPostsAlongRuns(lineLengthsFt: number[], panelWidthFt: number): number {
  const W = clampPanelWidth(panelWidthFt);
  const lengths = lineLengthsFt.map((x) => Math.max(0, Number(x) || 0)).filter((L) => L > 0);
  const N = lengths.length;
  if (N === 0) return 0;
  let sum = 0;
  for (const L of lengths) {
    sum += Math.ceil(L / W) + 1;
  }
  return Math.max(0, sum - (N - 1));
}

const RAILS_ITEM_ID = 'rails';

function roundMaterialQty(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const rounded = Math.round(n * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return Math.round(rounded);
  return rounded;
}

export interface PvcEstimateLineBreakdown {
  index: number;
  length_ft: number;
  /** ceil(length / panel width) — physical panel bays to cover the run */
  panel_bays_ceil: number;
  /** length ÷ panel width — used for proportional pickets / rails logic */
  panel_bays_exact: number;
}

export interface PvcEstimateResult {
  profile: PvcFenceMaterialProfileV1;
  line_breakdown: PvcEstimateLineBreakdown[];
  /** Sum of (line ft ÷ panel width) — proportional “panel equivalents” */
  total_panel_bays_exact: number;
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

  const W = profile.panel_width_ft;
  const breakdown: PvcEstimateLineBreakdown[] = lengths.map((L, i) => ({
    index: i,
    length_ft: L,
    panel_bays_ceil: L > 0 ? panelsOnLine(L, W) : 0,
    panel_bays_exact: L > 0 ? panelBaysExact(L, W) : 0,
  }));
  const totalBaysExact = breakdown.reduce((a, x) => a + x.panel_bays_exact, 0);

  const uChannelsEst = structuralCorners;
  const hPostsEst = estimateHPostsAlongRuns(lengths, W);

  const bomRows: PvcEstimateResult['bom_rows'] = [];
  for (const pi of profile.panel_items) {
    const qpp = Math.max(0, pi.quantity_per_panel);
    if (qpp <= 0) continue;

    if (pi.id === RAILS_ITEM_ID) {
      let railsSum = 0;
      for (const L of lengths) {
        if (L <= 0) continue;
        railsSum += railsForRun(L, W, qpp);
      }
      railsSum = Math.round(railsSum);
      if (railsSum > 0) {
        bomRows.push({
          name: pi.name,
          quantity: railsSum,
          note: `Full bays: ${qpp} rail(s) per bay. Last partial bay: 1 rail if the remainder is under half a panel, otherwise ${qpp}.`,
        });
      }
      continue;
    }

    let qtyAcc = 0;
    for (const L of lengths) {
      if (L <= 0) continue;
      qtyAcc += panelBaysExact(L, W) * qpp;
    }
    const qty = roundMaterialQty(qtyAcc);
    if (qty > 0) {
      bomRows.push({
        name: pi.name,
        quantity: qty,
        note:
          totalBaysExact > 0 && totalBaysExact !== Math.floor(totalBaysExact + 1e-9)
            ? 'Scaled by linear ft ÷ panel width (proportional for partial last bay).'
            : undefined,
      });
    }
  }

  bomRows.push({
    name: profile.h_post_display_name,
    quantity: hPostsEst,
    note:
      lengths.filter((x) => x > 0).length < 1
        ? undefined
        : 'One H-post per spacing station along runs; shared where two runs meet in order.',
  });

  const uNote =
    corner_detection === 'manual'
      ? '1 per structural corner (manual count).'
      : corner_detection === 'layout_planar'
        ? '1 per bend over threshold from Draw layout.'
        : corner_detection === 'map_segments'
          ? '1 per bend over threshold from map segments.'
          : lengths.filter((x) => x > 0).length >= 2
            ? 'Load a Draw layout or enter corners manually — 1 U-channel per direction change.'
            : undefined;

  bomRows.push({
    name: profile.u_channel_display_name,
    quantity: uChannelsEst,
    note: uNote,
  });

  return {
    profile,
    line_breakdown: breakdown,
    total_panel_bays_exact: roundMaterialQty(totalBaysExact) || totalBaysExact,
    structural_corners: structuralCorners,
    turn_angles_deg: turnAnglesDeg,
    u_channels_est: uChannelsEst,
    h_posts_est: hPostsEst,
    bom_rows: bomRows,
    corner_detection,
  };
}
