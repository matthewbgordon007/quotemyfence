export type MaterialCalculatorRoundingMode = 'none' | 'ceil' | 'nearest';

export type MaterialCalculatorInputField =
  | 'line_length_ft'
  | 'exact_panels'
  | 'rounded_panels'
  | 'h_post_terminations'
  | 'u_channel_terminations';

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

export const starterMaterialCalculatorTemplate: MaterialCalculatorTemplate = {
  id: 'starter-premium-fence',
  title: 'Material calculator framework',
  description:
    'Starter configuration for suppliers to define panel-based material rules before wiring in full custom math.',
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
      input_field: 'rounded_panels',
      rounding_mode: 'ceil',
      notes: 'Rounded up because partial panels still need full structural support.',
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
