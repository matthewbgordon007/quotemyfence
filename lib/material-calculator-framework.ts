export type MaterialCalculatorRoundingMode = 'none' | 'ceil' | 'nearest';

export type MaterialCalculatorInputField =
  | 'line_length_ft'
  | 'exact_panels'
  | 'rounded_panels'
  /** Whole panels plus one starter post at the start of the run (ceil(panels) + 1). */
  | 'line_posts_including_first'
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

export const starterMaterialCalculatorTemplate: MaterialCalculatorTemplate = {
  id: 'starter-premium-fence',
  title: '',
  description: 'Adobe, 6ft',
  panel_length_ft: 8.21,
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
      notes: 'One post per whole panel plus one starter post for the first panel.',
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
    notes: 'length_ft / panel_length_ft',
  },
  {
    id: 'total_whole_panels',
    label: 'Total Whole Number of Fence line Panels',
    mode: 'calculated',
    section: 'color_line',
    notes: 'ceil(total_fence_line_panels)',
  },
  {
    id: 'line_posts_including_first',
    label: 'Line posts (whole panels + 1 starter post)',
    mode: 'calculated',
    section: 'color_line',
    notes: 'ceil(total_fence_line_panels) + 1 for the first post that starts the line.',
  },
  {
    id: 'posts',
    label: 'Posts',
    mode: 'calculated',
    section: 'color_line',
    notes: 'Structural line posts: whole panels plus one starter post unless overridden in the recipe.',
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
  { id: 'color-galv-post', name: 'Galvanized Post', quantity_per_panel: 1, input_field: 'line_posts_including_first', rounding_mode: 'ceil' },
  {
    id: 'color-h-post',
    name: 'H Post',
    quantity_per_panel: 1,
    input_field: 'line_posts_including_first',
    rounding_mode: 'ceil',
    notes: 'Matches structural line post count (whole panels + starter post), same as galvanized posts.',
  },
  {
    id: 'color-cap-h-post',
    name: 'Cap (H Post)',
    quantity_per_panel: 1,
    input_field: 'line_posts_including_first',
    rounding_mode: 'ceil',
    notes: 'One cap per line post; same multiply-from as H Post / galvanized.',
  },
  { id: 'color-rail', name: 'Rail', quantity_per_panel: 2, input_field: 'exact_panels', rounding_mode: 'ceil' },
  { id: 'color-rail-stiffener', name: 'Rail Stiffener', quantity_per_panel: 2, input_field: 'exact_panels', rounding_mode: 'ceil' },
  { id: 'color-board', name: 'Board', quantity_per_panel: 16, input_field: 'exact_panels', rounding_mode: 'nearest' },
  { id: 'color-board-stiffener', name: 'Board Stiffener', quantity_per_panel: 3, input_field: 'exact_panels', rounding_mode: 'nearest' },
  { id: 'color-short-screw', name: 'Short Screw', quantity_per_panel: 1, input_field: 'line_posts_including_first', rounding_mode: 'ceil' },
  {
    id: 'color-long-screw',
    name: 'Long Screw',
    quantity_per_panel: 4,
    input_field: 'exact_panels',
    rounding_mode: 'ceil',
    notes: 'Line: 4× exact panels (round up). Gate line adds more long screws per gate boards — see gate recipe.',
  },
  { id: 'color-plug', name: 'Plug', quantity_per_panel: 4, input_field: 'exact_panels', rounding_mode: 'nearest' },
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
    quantity_per_panel: 1.09,
    input_field: 'gate_total_boards',
    rounding_mode: 'ceil',
    notes: 'Tuned with line short screws (1 per line post) to match supplier takeoff sheets.',
  },
  {
    id: 'gate-long-screw',
    name: 'Long Screw',
    quantity_per_panel: 3.7,
    input_field: 'gate_total_boards',
    rounding_mode: 'ceil',
    notes: 'Tuned vs line long screws (4× exact panels, round up) for typical single-gate board counts.',
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
