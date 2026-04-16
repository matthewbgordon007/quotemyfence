import { excelRound, excelRoundUp } from '@/lib/excel-math';
import { FMS_PVC_PANEL_LENGTH_DIVISOR, fmsPvcLongPlugAdjusted } from '@/lib/fms-pvc-calculator';

export type MaterialCalculatorRoundingMode = 'none' | 'ceil' | 'nearest';

export type MaterialCalculatorInputField =
  | 'line_length_ft'
  | 'exact_panels'
  | 'rounded_panels'
  /** PVC sheet post count for galvanized/H/caps/screws: ceil(panels) + H post terminations − 1 (e.g. =D9+D6−1). */
  | 'line_posts_including_first'
  /** PVC sheet Final for long screws: IF on U channel (B22) applied to ceil(4×exact panels). */
  | 'pvc_long_screw_sheet_final'
  /** PVC sheet Final for plugs: paired IF on U channel (B22). */
  | 'pvc_plug_sheet_final'
  | 'h_post_terminations'
  | 'u_channel_terminations'
  | 'gate_unit'
  | 'gate_posts_needed'
  | 'gate_total_boards';

export type MaterialCalculatorSectionKind = 'job-info' | 'panel-basis' | 'line-inputs' | 'recipe-items' | 'output';

export interface MaterialCalculatorRecipeItem {
  id: string;
  name: string;
  quantity_per_panel: number;
  input_field: MaterialCalculatorInputField;
  rounding_mode: MaterialCalculatorRoundingMode;
  notes?: string;
}

export interface MaterialCalculatorSection {
  id: string;
  kind: MaterialCalculatorSectionKind;
  title: string;
  description: string;
}

export interface MaterialCalculatorTemplate {
  id: string;
  title: string;
  description: string;
  panel_length_ft: number;
  sections: MaterialCalculatorSection[];
  recipe_items: MaterialCalculatorRecipeItem[];
}

export interface MaterialCalculatorFieldSpec {
  id: string;
  label: string;
  mode: 'input' | 'calculated';
  section: 'color_line' | 'gate_line';
  notes?: string;
}

/** Panel length divisor from `Material Calculator - PVC` cell C8 (`=C5/8.20833333`). */
export const PVC_PANEL_LENGTH_DIVISOR_SHEET = FMS_PVC_PANEL_LENGTH_DIVISOR;

export const starterMaterialCalculatorTemplate: MaterialCalculatorTemplate = {
  id: 'starter-premium-fence',
  title: '',
  description: 'Adobe, 6ft',
  panel_length_ft: FMS_PVC_PANEL_LENGTH_DIVISOR,
  sections: [
    {
      id: 'job-info',
      kind: 'job-info',
      title: 'Job details',
      description: 'Address, colour, height, and the contractor-facing label for this calculation.',
    },
    {
      id: 'panel-basis',
      kind: 'panel-basis',
      title: 'Panel basis',
      description:
        'Enter the panel length used for this system. Exact panel count is length / panel length and whole panels always round up.',
    },
    {
      id: 'line-inputs',
      kind: 'line-inputs',
      title: 'Line inputs',
      description:
        'Each fence line can capture total length plus line-specific termination counts like H posts and U channels.',
    },
    {
      id: 'recipe-items',
      kind: 'recipe-items',
      title: 'Per-panel material recipe',
      description:
        'Suppliers define what goes into a panel so the calculator can multiply exact or rounded panel counts by item.',
    },
    {
      id: 'output',
      kind: 'output',
      title: 'Output preview',
      description:
        'Show exact panels, rounded panels, and the resulting material list. Advanced formulas can be layered in later.',
    },
  ],
  recipe_items: [
    {
      id: 'galvanized-post',
      name: 'Galvanized Post',
      quantity_per_panel: 1,
      input_field: 'line_posts_including_first',
      rounding_mode: 'ceil',
      notes: 'Uses PVC line post count: whole panels + H terminations − 1 (same as first-sheet galvanized).',
    },
    {
      id: 'h-post',
      name: 'H Post',
      quantity_per_panel: 1,
      input_field: 'h_post_terminations',
      rounding_mode: 'ceil',
      notes: 'Usually driven by termination count instead of pure panel count.',
    },
    {
      id: 'rail',
      name: 'Rail',
      quantity_per_panel: 2,
      input_field: 'exact_panels',
      rounding_mode: 'ceil',
      notes: 'Typically two rails per panel, rounded up to ensure coverage.',
    },
    {
      id: 'board',
      name: 'Board',
      quantity_per_panel: 16,
      input_field: 'exact_panels',
      rounding_mode: 'nearest',
      notes: 'Good candidate for partial-panel math later because board count may scale directly.',
    },
    {
      id: 'u-channel',
      name: 'U Channel',
      quantity_per_panel: 1,
      input_field: 'u_channel_terminations',
      rounding_mode: 'ceil',
      notes: 'Usually based on corner/termination inputs, not panel count.',
    },
  ],
};

export const firstSheetFieldSpecs: MaterialCalculatorFieldSpec[] = [
  {
    id: 'address_line_label',
    label: 'Address / Line Label',
    mode: 'input',
    section: 'color_line',
  },
  {
    id: 'color_and_height',
    label: 'Color And Height',
    mode: 'input',
    section: 'color_line',
  },
  {
    id: 'total_fence_line_length_ft',
    label: 'Total Fence Line Length (Feet)',
    mode: 'input',
    section: 'color_line',
  },
  {
    id: 'fence_terminated_h_post',
    label: 'Fence Terminated with H post (Type 0, 1, or 2)',
    mode: 'input',
    section: 'color_line',
  },
  {
    id: 'fence_terminated_u_channel',
    label: 'Fence Terminated with U Channel (Type 0, 1, or 2)',
    mode: 'input',
    section: 'color_line',
  },
  {
    id: 'total_fence_line_panels',
    label: 'Total Fence Line Panels',
    mode: 'calculated',
    section: 'color_line',
    notes: 'length_ft / 8.20833333 (PVC tab C8)',
  },
  {
    id: 'total_whole_panels',
    label: 'Total Whole Number of Fence line Panels',
    mode: 'calculated',
    section: 'color_line',
    notes: 'D9 = ROUNDUP(ROUND(C8,4),0)',
  },
  {
    id: 'line_posts_including_first',
    label: 'Post count for materials (whole panels + H terminations − 1)',
    mode: 'calculated',
    section: 'color_line',
    notes: 'Fence line =D9+D6−1, plus gate posts needed for the run. Often 2 higher than a D9-only “Posts” row when D6=3 (D6−1=2).',
  },
  {
    id: 'pvc_long_screw_sheet_final',
    label: 'Long screw Final (PVC IF on U channel)',
    mode: 'calculated',
    section: 'color_line',
    notes: 'D20 on PVC tab: IF on B22 (=D7) applied to C20=D9×4 (whole panels, not exact C8).',
  },
  {
    id: 'pvc_plug_sheet_final',
    label: 'Plug Final (PVC IF on U channel)',
    mode: 'calculated',
    section: 'color_line',
    notes: 'D21 on PVC tab: IF on B22 applied to C21=D9×4.',
  },
  {
    id: 'posts',
    label: 'Posts',
    mode: 'calculated',
    section: 'color_line',
    notes: 'Same as line post count for materials unless your sheet uses a separate “Posts” row; see line_posts_including_first.',
  },
  {
    id: 'gate_address_line_label',
    label: 'Address / Line Label',
    mode: 'input',
    section: 'gate_line',
  },
  {
    id: 'gate_color_height',
    label: 'Color And Height',
    mode: 'input',
    section: 'gate_line',
  },
  {
    id: 'total_gate_line_width_inches',
    label: 'Total Gate Line Width (Inches)',
    mode: 'input',
    section: 'gate_line',
  },
  {
    id: 'posts_needed_gate',
    label: 'Post needed (0, 1, or 2)',
    mode: 'input',
    section: 'gate_line',
  },
  {
    id: 'total_gate_door_width',
    label: 'Total Gate Door Width',
    mode: 'calculated',
    section: 'gate_line',
  },
  {
    id: 'total_gate_boards',
    label: 'Total Gate Boards',
    mode: 'calculated',
    section: 'gate_line',
  },
];

export const firstSheetColorLineRecipeDefaults: MaterialCalculatorRecipeItem[] = [
  {
    id: 'color-concrete',
    name: 'Concrete',
    quantity_per_panel: 2.5,
    input_field: 'line_posts_including_first',
    rounding_mode: 'none',
    notes: '2.5 per line post (e.g. bags); adjust multiplier in the recipe if your supplier uses a different spec.',
  },
  { id: 'color-galv-post', name: 'Galvanized Post', quantity_per_panel: 1, input_field: 'line_posts_including_first', rounding_mode: 'ceil' },
  {
    id: 'color-h-post',
    name: 'H Post',
    quantity_per_panel: 1,
    input_field: 'line_posts_including_first',
    rounding_mode: 'ceil',
    notes: 'Same post count as galvanized on the PVC sheet (whole panels + H terminations − 1).',
  },
  {
    id: 'color-cap-h-post',
    name: 'Cap (H Post)',
    quantity_per_panel: 1,
    input_field: 'line_posts_including_first',
    rounding_mode: 'ceil',
    notes: 'Same multiply-from as H Post / galvanized (PVC sheet D9 + D6 − 1).',
  },
  { id: 'color-rail', name: 'Rail', quantity_per_panel: 2, input_field: 'exact_panels', rounding_mode: 'ceil' },
  { id: 'color-rail-stiffener', name: 'Rail Stiffener', quantity_per_panel: 2, input_field: 'exact_panels', rounding_mode: 'ceil' },
  { id: 'color-board', name: 'Board', quantity_per_panel: 16, input_field: 'exact_panels', rounding_mode: 'nearest' },
  { id: 'color-board-stiffener', name: 'Board Stiffener', quantity_per_panel: 3, input_field: 'exact_panels', rounding_mode: 'nearest' },
  {
    id: 'color-short-screw',
    name: 'Short Screw',
    quantity_per_panel: 1,
    input_field: 'line_posts_including_first',
    rounding_mode: 'ceil',
    notes: 'After sheet-style ceil on line posts, add +1 spare short screw (see calculator preview).',
  },
  {
    id: 'color-long-screw',
    name: 'Long Screw',
    quantity_per_panel: 1,
    input_field: 'pvc_long_screw_sheet_final',
    rounding_mode: 'none',
    notes: 'Sheet Final plus 10 extra long screws job-wide. Gate line still adds long screws per gate boards.',
  },
  {
    id: 'color-plug',
    name: 'Plug',
    quantity_per_panel: 1,
    input_field: 'pvc_plug_sheet_final',
    rounding_mode: 'none',
    notes: 'Sheet Final plus 10 extra plugs (hole caps) job-wide.',
  },
  { id: 'color-u-channel', name: 'U Channel', quantity_per_panel: 1, input_field: 'u_channel_terminations', rounding_mode: 'ceil' },
];

/** Gate line adds boards, hardware, and braces. Line-level post counts (galvanized / H / caps) stay on the color recipe so they are not double-counted here. */
export const firstSheetGateLineRecipeDefaults: MaterialCalculatorRecipeItem[] = [
  { id: 'gate-rail', name: 'Rail', quantity_per_panel: 1, input_field: 'gate_unit', rounding_mode: 'ceil' },
  { id: 'gate-rail-stiffener', name: 'Rail Stiffener', quantity_per_panel: 1, input_field: 'gate_unit', rounding_mode: 'ceil' },
  { id: 'gate-board', name: 'Board', quantity_per_panel: 1, input_field: 'gate_total_boards', rounding_mode: 'ceil' },
  {
    id: 'gate-short-screw',
    name: 'Short Screw',
    quantity_per_panel: 1.33,
    input_field: 'gate_total_boards',
    rounding_mode: 'ceil',
    notes: 'Added to line short screws; ceil after multiply by gate boards.',
  },
  {
    id: 'gate-long-screw',
    name: 'Long Screw',
    quantity_per_panel: 1.25,
    input_field: 'gate_total_boards',
    rounding_mode: 'ceil',
    notes: 'Added to line long screws; ceil after multiply by gate boards.',
  },
  { id: 'gate-plug', name: 'Plug', quantity_per_panel: 2.25, input_field: 'gate_total_boards', rounding_mode: 'ceil' },
  { id: 'gate-u-channel', name: 'U Channel', quantity_per_panel: 1, input_field: 'gate_posts_needed', rounding_mode: 'ceil' },
  { id: 'gate-cross-brace', name: 'Gate Cross Brace', quantity_per_panel: 1, input_field: 'gate_unit', rounding_mode: 'ceil' },
  { id: 'gate-overhead-brace', name: 'Gate OverHead Brace', quantity_per_panel: 0.5, input_field: 'gate_unit', rounding_mode: 'none' },
  { id: 'gate-latch-kit', name: 'Latch kit', quantity_per_panel: 1, input_field: 'gate_unit', rounding_mode: 'ceil' },
  { id: 'gate-hinge-kit', name: 'Hinge Kit', quantity_per_panel: 1, input_field: 'gate_unit', rounding_mode: 'ceil' },
  {
    id: 'gate-h-post-stiffener',
    name: 'H Post Stiffener',
    quantity_per_panel: 1,
    input_field: 'gate_unit',
    rounding_mode: 'ceil',
    notes: 'Same count as hinges; keep qty / multiply-from in sync with Hinge Kit.',
  },
];

/**
 * C20 / C21 base on the PVC tab before U-channel IFs: `=D9*B20` with B20=B21=4 → **4 × whole panels (D9)**.
 * Pass **C8** (unrounded length ÷ 8.20833333), same as `exact_panels` from the sheet.
 */
export function pvcScrewPlugBaseFromExactPanels(exactPanelsC8: number): number {
  const d9 = pvcWholePanelsD9(exactPanelsC8);
  return d9 * 4;
}

/** B22 in the sheet: U channel termination type 0, 1, or 2. */
export function pvcSheetUChannelBranch(uChannelTerminations: number): 0 | 1 | 2 {
  const n = Number(uChannelTerminations);
  if (!Number.isFinite(n)) return 0;
  return Math.min(2, Math.max(0, Math.round(n))) as 0 | 1 | 2;
}

/** Long screw D20 on the PVC calculator tab (no master-tab extras). */
export function pvcLongScrewFinalFromSheet(exactPanels: number, uChannelTerminations: number): number {
  const c = pvcScrewPlugBaseFromExactPanels(exactPanels);
  const b = pvcSheetUChannelBranch(uChannelTerminations);
  return fmsPvcLongPlugAdjusted(c, b, true);
}

/** Plug D21 on the PVC calculator tab (no master-tab extras). */
export function pvcPlugFinalFromSheet(exactPanels: number, uChannelTerminations: number): number {
  const c = pvcScrewPlugBaseFromExactPanels(exactPanels);
  const b = pvcSheetUChannelBranch(uChannelTerminations);
  return fmsPvcLongPlugAdjusted(c, b, false);
}

/** Sheet D9: `=ROUNDUP(ROUND(C8,4),0)` on the PVC tab. */
export function pvcWholePanelsD9(exactPanelsC8: number): number {
  if (!Number.isFinite(exactPanelsC8) || exactPanelsC8 <= 0) return 0;
  const c9 = excelRound(exactPanelsC8, 4);
  if (c9 <= 0) return 0;
  return excelRoundUp(c9, 0);
}

/**
 * Fence color line only: =D9+D6−1 (whole panels + H terminations − 1).
 * This is usually **not** the same as a separate “Posts” row that shows **D9 only** — when D6 is 3, material post count is **2 higher** than D9-only (because 3−1=2).
 */
export function pvcLinePostsForMaterials(exactPanelsC8: number, hPostTerminationsD6: number): number {
  const d9 = pvcWholePanelsD9(exactPanelsC8);
  const d6 = Math.max(0, Math.round(Number(hPostTerminationsD6) || 0));
  return Math.max(0, d9 + d6 - 1);
}

/** Total structural posts for the job: fence line (D9+D6−1) plus gate posts needed (0–2). */
export function pvcLinePostsIncludingGatePosts(
  exactPanels: number,
  hPostTerminationsD6: number,
  gatePostsNeeded: number,
): number {
  const fence = pvcLinePostsForMaterials(exactPanels, hPostTerminationsD6);
  const g = Math.max(0, Math.round(Number(gatePostsNeeded) || 0));
  return fence + g;
}
