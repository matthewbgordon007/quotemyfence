/**
 * Per-supplier PVC calculator recipe (Layer 1): spacing, qty-per-panel, labels, packs, gate fixed add-ons.
 * Defaults match FMS 2026 workbook — calculations unchanged when using defaults.
 */

import type { FmsPvcPanelModule } from '@/lib/fms-pvc-material-calculator';

export type FmsGateRecipeAddons = {
  /** Short gate row 26; added into single/double long-screw totals (FMS uses 10 / 18). */
  long_screw_base: number;
  /** Added inside short gate plug row formula (FMS +10 on row 27). */
  plug_formula_add: number;
  u_channel: number;
  overhead_brace: number;
  diagonal_brace: number;
  latch: number;
  hinge: number;
  h_post_stiffener: number;
};

export type FmsCalculatorRecipeV1 = {
  version: 1;
  fence: {
    panel_spacing_ft: Record<FmsPvcPanelModule, number>;
    per_panel: {
      galvanized: number;
      h_post: number;
      cap_h_post: number;
      rail: number;
      rail_stiffener: number;
      board: number;
      board_stiffener: number;
      long_screw: number;
      short_screw: number;
      plug: number;
    };
    /** 6′ panel module: board qty = (derived ft) × this (FMS uses 2). */
    board_multiplier_6ft: number;
  };
  fence_sku_labels: {
    galvanized_post: string;
    h_post: string;
    cap_h_post: string;
    rail: string;
    rail_stiffener: string;
    board: string;
    board_stiffener: string;
    long_screw: string;
    short_screw: string;
    plug: string;
    u_channel: string;
    h_post_stiffener: string;
  };
  master_labels: {
    concrete: string;
    rail: string;
    rail_stiffener: string;
    board: string;
    board_stiffener: string;
    h_post: string;
    galvanized_post: string;
    u_channel: string;
    h_post_stiffener: string;
    post_filler: string;
    overhead_brace: string;
    diagonal_brace: string;
    base_plates: string;
    lattice: string;
    post_cap: string;
    hole_plug: string;
    large_screw: string;
    short_screw: string;
    latch: string;
    hinge: string;
    drop_rod: string;
  };
  packs: {
    board_per_pack: number;
    board_stiffeners_per_pack: number;
    rail_per_pack: number;
    rail_stiffeners_per_pack: number;
    u_channel_per_pack: number;
  };
  concrete_bags_per_h_post: number;
  master_rollups: {
    hole_plug_add: number;
    large_screw_add: number;
  };
  gate: {
    short: FmsGateRecipeAddons;
    single: FmsGateRecipeAddons;
    double: FmsGateRecipeAddons;
  };
};

const DEFAULT_GATE_ADDONS: FmsGateRecipeAddons = {
  long_screw_base: 10,
  plug_formula_add: 10,
  u_channel: 2,
  overhead_brace: 1,
  diagonal_brace: 0.5,
  latch: 1,
  hinge: 1,
  h_post_stiffener: 1,
};

export const DEFAULT_FMS_CALCULATOR_RECIPE: FmsCalculatorRecipeV1 = {
  version: 1,
  fence: {
    panel_spacing_ft: {
      nominal_7ft: 8.20833333,
      nominal_6ft: 6,
    },
    per_panel: {
      galvanized: 1,
      h_post: 1,
      cap_h_post: 1,
      rail: 2,
      rail_stiffener: 2,
      board: 16,
      board_stiffener: 3,
      long_screw: 4,
      short_screw: 2,
      plug: 4,
    },
    board_multiplier_6ft: 2,
  },
  fence_sku_labels: {
    galvanized_post: 'Galvanized Post',
    h_post: 'H Post',
    cap_h_post: 'Cap (H Post)',
    rail: 'Rail',
    rail_stiffener: 'Rail Stiffener',
    board: 'Board',
    board_stiffener: 'Board Stiffener',
    long_screw: 'Long Screw',
    short_screw: 'Short Screw',
    plug: 'Plug',
    u_channel: 'U Channel',
    h_post_stiffener: 'H Post Stiffener',
  },
  master_labels: {
    concrete: 'Concrete',
    rail: 'Rail',
    rail_stiffener: 'Rail Stiffener',
    board: 'Board',
    board_stiffener: 'Board Stiffener',
    h_post: 'H-Post',
    galvanized_post: 'Galvanized Post',
    u_channel: 'U-Channel',
    h_post_stiffener: 'H-Post Stiffener',
    post_filler: 'Post Filler',
    overhead_brace: 'Overhead Brace',
    diagonal_brace: 'Diagonal Brace',
    base_plates: 'Base Plates',
    lattice: "Lattice (1' x 8')",
    post_cap: 'Post Cap',
    hole_plug: 'Hole Plug',
    large_screw: 'Large Screw',
    short_screw: 'Short Screw',
    latch: '*PREMIUM*Latch',
    hinge: '*PREMIUM*Hinge',
    drop_rod: 'Drop Rod/Sleeve',
  },
  packs: {
    board_per_pack: 16,
    board_stiffeners_per_pack: 3,
    rail_per_pack: 2,
    rail_stiffeners_per_pack: 2,
    u_channel_per_pack: 2,
  },
  concrete_bags_per_h_post: 2.5,
  master_rollups: {
    hole_plug_add: 10,
    large_screw_add: 10,
  },
  gate: {
    short: { ...DEFAULT_GATE_ADDONS },
    single: { ...DEFAULT_GATE_ADDONS },
    double: {
      long_screw_base: 18,
      plug_formula_add: 10,
      u_channel: 4,
      overhead_brace: 2,
      diagonal_brace: 1,
      latch: 1,
      hinge: 2,
      h_post_stiffener: 2,
    },
  },
};

function clampQty(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 10000) / 10000;
}

function clampSpacing(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(120, Math.max(0.5, Math.round(n * 1000000) / 1000000));
}

function clampLabel(v: unknown, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || fallback;
}

function mergeGateAddons(raw: unknown, fallback: FmsGateRecipeAddons): FmsGateRecipeAddons {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    long_screw_base: clampQty(o.long_screw_base, fallback.long_screw_base),
    plug_formula_add: clampQty(o.plug_formula_add, fallback.plug_formula_add),
    u_channel: clampQty(o.u_channel, fallback.u_channel),
    overhead_brace: clampQty(o.overhead_brace, fallback.overhead_brace),
    diagonal_brace: clampQty(o.diagonal_brace, fallback.diagonal_brace),
    latch: clampQty(o.latch, fallback.latch),
    hinge: clampQty(o.hinge, fallback.hinge),
    h_post_stiffener: clampQty(o.h_post_stiffener, fallback.h_post_stiffener),
  };
}

/** Normalize saved JSON; missing fields fall back to FMS defaults. */
export function normalizeFmsCalculatorRecipe(raw: unknown): FmsCalculatorRecipeV1 {
  const d = DEFAULT_FMS_CALCULATOR_RECIPE;
  if (!raw || typeof raw !== 'object') return structuredClone(d);
  const o = raw as Record<string, unknown>;
  const fence = (o.fence && typeof o.fence === 'object' ? o.fence : {}) as Record<string, unknown>;
  const spacing = (fence.panel_spacing_ft && typeof fence.panel_spacing_ft === 'object'
    ? fence.panel_spacing_ft
    : {}) as Record<string, unknown>;
  const perPanel = (fence.per_panel && typeof fence.per_panel === 'object' ? fence.per_panel : {}) as Record<
    string,
    unknown
  >;
  const sku = (o.fence_sku_labels && typeof o.fence_sku_labels === 'object' ? o.fence_sku_labels : {}) as Record<
    string,
    unknown
  >;
  const master = (o.master_labels && typeof o.master_labels === 'object' ? o.master_labels : {}) as Record<
    string,
    unknown
  >;
  const packs = (o.packs && typeof o.packs === 'object' ? o.packs : {}) as Record<string, unknown>;
  const rollups = (o.master_rollups && typeof o.master_rollups === 'object' ? o.master_rollups : {}) as Record<
    string,
    unknown
  >;
  const gate = (o.gate && typeof o.gate === 'object' ? o.gate : {}) as Record<string, unknown>;

  return {
    version: 1,
    fence: {
      panel_spacing_ft: {
        nominal_7ft: clampSpacing(spacing.nominal_7ft, d.fence.panel_spacing_ft.nominal_7ft),
        nominal_6ft: clampSpacing(spacing.nominal_6ft, d.fence.panel_spacing_ft.nominal_6ft),
      },
      per_panel: {
        galvanized: clampQty(perPanel.galvanized, d.fence.per_panel.galvanized),
        h_post: clampQty(perPanel.h_post, d.fence.per_panel.h_post),
        cap_h_post: clampQty(perPanel.cap_h_post, d.fence.per_panel.cap_h_post),
        rail: clampQty(perPanel.rail, d.fence.per_panel.rail),
        rail_stiffener: clampQty(perPanel.rail_stiffener, d.fence.per_panel.rail_stiffener),
        board: clampQty(perPanel.board, d.fence.per_panel.board),
        board_stiffener: clampQty(perPanel.board_stiffener, d.fence.per_panel.board_stiffener),
        long_screw: clampQty(perPanel.long_screw, d.fence.per_panel.long_screw),
        short_screw: clampQty(perPanel.short_screw, d.fence.per_panel.short_screw),
        plug: clampQty(perPanel.plug, d.fence.per_panel.plug),
      },
      board_multiplier_6ft: clampQty(fence.board_multiplier_6ft, d.fence.board_multiplier_6ft),
    },
    fence_sku_labels: {
      galvanized_post: clampLabel(sku.galvanized_post, d.fence_sku_labels.galvanized_post),
      h_post: clampLabel(sku.h_post, d.fence_sku_labels.h_post),
      cap_h_post: clampLabel(sku.cap_h_post, d.fence_sku_labels.cap_h_post),
      rail: clampLabel(sku.rail, d.fence_sku_labels.rail),
      rail_stiffener: clampLabel(sku.rail_stiffener, d.fence_sku_labels.rail_stiffener),
      board: clampLabel(sku.board, d.fence_sku_labels.board),
      board_stiffener: clampLabel(sku.board_stiffener, d.fence_sku_labels.board_stiffener),
      long_screw: clampLabel(sku.long_screw, d.fence_sku_labels.long_screw),
      short_screw: clampLabel(sku.short_screw, d.fence_sku_labels.short_screw),
      plug: clampLabel(sku.plug, d.fence_sku_labels.plug),
      u_channel: clampLabel(sku.u_channel, d.fence_sku_labels.u_channel),
      h_post_stiffener: clampLabel(sku.h_post_stiffener, d.fence_sku_labels.h_post_stiffener),
    },
    master_labels: {
      concrete: clampLabel(master.concrete, d.master_labels.concrete),
      rail: clampLabel(master.rail, d.master_labels.rail),
      rail_stiffener: clampLabel(master.rail_stiffener, d.master_labels.rail_stiffener),
      board: clampLabel(master.board, d.master_labels.board),
      board_stiffener: clampLabel(master.board_stiffener, d.master_labels.board_stiffener),
      h_post: clampLabel(master.h_post, d.master_labels.h_post),
      galvanized_post: clampLabel(master.galvanized_post, d.master_labels.galvanized_post),
      u_channel: clampLabel(master.u_channel, d.master_labels.u_channel),
      h_post_stiffener: clampLabel(master.h_post_stiffener, d.master_labels.h_post_stiffener),
      post_filler: clampLabel(master.post_filler, d.master_labels.post_filler),
      overhead_brace: clampLabel(master.overhead_brace, d.master_labels.overhead_brace),
      diagonal_brace: clampLabel(master.diagonal_brace, d.master_labels.diagonal_brace),
      base_plates: clampLabel(master.base_plates, d.master_labels.base_plates),
      lattice: clampLabel(master.lattice, d.master_labels.lattice),
      post_cap: clampLabel(master.post_cap, d.master_labels.post_cap),
      hole_plug: clampLabel(master.hole_plug, d.master_labels.hole_plug),
      large_screw: clampLabel(master.large_screw, d.master_labels.large_screw),
      short_screw: clampLabel(master.short_screw, d.master_labels.short_screw),
      latch: clampLabel(master.latch, d.master_labels.latch),
      hinge: clampLabel(master.hinge, d.master_labels.hinge),
      drop_rod: clampLabel(master.drop_rod, d.master_labels.drop_rod),
    },
    packs: {
      board_per_pack: clampQty(packs.board_per_pack, d.packs.board_per_pack) || 16,
      board_stiffeners_per_pack: clampQty(packs.board_stiffeners_per_pack, d.packs.board_stiffeners_per_pack) || 3,
      rail_per_pack: clampQty(packs.rail_per_pack, d.packs.rail_per_pack) || 2,
      rail_stiffeners_per_pack: clampQty(packs.rail_stiffeners_per_pack, d.packs.rail_stiffeners_per_pack) || 2,
      u_channel_per_pack: clampQty(packs.u_channel_per_pack, d.packs.u_channel_per_pack) || 2,
    },
    concrete_bags_per_h_post: clampQty(o.concrete_bags_per_h_post, d.concrete_bags_per_h_post),
    master_rollups: {
      hole_plug_add: clampQty(rollups.hole_plug_add, d.master_rollups.hole_plug_add),
      large_screw_add: clampQty(rollups.large_screw_add, d.master_rollups.large_screw_add),
    },
    gate: {
      short: mergeGateAddons(gate.short, d.gate.short),
      single: mergeGateAddons(gate.single, d.gate.single),
      double: mergeGateAddons(gate.double, d.gate.double),
    },
  };
}

export function resolveFmsCalculatorRecipe(recipe?: FmsCalculatorRecipeV1 | null): FmsCalculatorRecipeV1 {
  return recipe ? normalizeFmsCalculatorRecipe(recipe) : DEFAULT_FMS_CALCULATOR_RECIPE;
}
