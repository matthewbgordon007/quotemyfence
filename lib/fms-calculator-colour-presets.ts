/**
 * Colour names aligned with per-colour calculator / breakdown tabs in the FMS workbook
 * (e.g. "{Colour} - Material List Breakdown", WPC horizontal colour sheets).
 * Used for UI labels and exports; PVC fence/gate formulas are shared across colours unless
 * sheet-specific multipliers are added later.
 */

export const FMS_PVC_CALCULATOR_COLOURS = [
  'White',
  'Adobe',
  'Light Grey',
  'Westport Grey',
  'Dark Grey',
  'Teak',
  'Moonlit',
] as const;

export type FmsPvcCalculatorColour = (typeof FMS_PVC_CALCULATOR_COLOURS)[number];

export const FMS_WPC_CALCULATOR_COLOURS = [
  'Ash',
  'Driftwood',
  'Eclipse',
  'Iron',
  'Mocha',
  'Onyx',
  'Walnut',
] as const;

export type FmsWpcCalculatorColour = (typeof FMS_WPC_CALCULATOR_COLOURS)[number];

/** Wood-grain hybrid board colours from the product catalog (breakdown / label sheets). */
export const FMS_HYBRID_EXTRA_WPC_COLOURS = ['Mahogany', 'Green Teak'] as const;

export type FmsHybridMaterialLine = 'pvc' | 'wpc';

export const FMS_HYBRID_COLOUR_GROUPS: { label: string; colours: readonly string[] }[] = [
  { label: 'PVC', colours: FMS_PVC_CALCULATOR_COLOURS },
  {
    label: 'WPC',
    colours: [...FMS_WPC_CALCULATOR_COLOURS, ...FMS_HYBRID_EXTRA_WPC_COLOURS],
  },
];

const HYBRID_COLOUR_SET = new Set<string>(
  FMS_HYBRID_COLOUR_GROUPS.flatMap((g) => g.colours)
);

export function fmsHybridAllColours(): readonly string[] {
  return Array.from(HYBRID_COLOUR_SET);
}

export function coerceFmsHybridCalculatorColour(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s || !HYBRID_COLOUR_SET.has(s)) return null;
  return s;
}

export function fmsHybridColourExportLabel(
  orientation: 'horizontal' | 'vertical',
  material: FmsHybridMaterialLine,
  colour: string
): string {
  const tag = orientation === 'horizontal' ? 'horizontal' : 'vertical';
  return `${colour} (${material.toUpperCase()} ${tag})`;
}

/** Parse saved calculator colour labels like `Ash (WPC horizontal)`. */
export function parseFmsHybridColourExportLabel(raw: string | null | undefined): {
  colour: string;
  material: FmsHybridMaterialLine | null;
  orientation: 'horizontal' | 'vertical' | null;
} | null {
  const s = (raw ?? '').trim();
  const m = /^(.+?)\s*\((PVC|WPC)\s+(horizontal|vertical)\)\s*$/i.exec(s);
  if (!m) return null;
  const colour = coerceFmsHybridCalculatorColour(m[1]) ?? m[1].trim();
  if (!colour) return null;
  return {
    colour,
    material: m[2].toLowerCase() as FmsHybridMaterialLine,
    orientation: m[3].toLowerCase() as 'horizontal' | 'vertical',
  };
}

/** Guess PVC vs WPC material line from quote type/style text. */
export function inferHybridMaterialLineFromText(blob: string): FmsHybridMaterialLine {
  const b = blob.toLowerCase();
  if (/\bpremium\b/.test(b) || /\bwood\s*grain\b/.test(b) || /\bwpc\b/.test(b)) return 'wpc';
  if (/\bstandard\b/.test(b) || /\bslatted\b/.test(b) || /\bpvc\b/.test(b) || /\bvinyl\b/.test(b)) return 'pvc';
  return 'wpc';
}

const PVC_SET = new Set<string>(FMS_PVC_CALCULATOR_COLOURS);
const WPC_SET = new Set<string>(FMS_WPC_CALCULATOR_COLOURS);

export function coerceFmsPvcCalculatorColour(raw: string | null | undefined): FmsPvcCalculatorColour | null {
  const s = (raw ?? '').trim();
  if (!s || !PVC_SET.has(s)) return null;
  return s as FmsPvcCalculatorColour;
}

export function coerceFmsWpcCalculatorColour(raw: string | null | undefined): FmsWpcCalculatorColour | null {
  const s = (raw ?? '').trim();
  if (!s || !WPC_SET.has(s)) return null;
  return s as FmsWpcCalculatorColour;
}

/** Excel-style subtitle for the colour breakdown block. */
export function fmsPvcMaterialListBreakdownTitle(colour: FmsPvcCalculatorColour): string {
  return `${colour} — Material List Breakdown`;
}

export function fmsWpcHorizontalCalculatorTitle(colour: FmsWpcCalculatorColour): string {
  return `${colour} — Horizontal 6' WPC (colour sheet)`;
}

export function fmsPvcVerticalCalculatorTitle(colour: FmsPvcCalculatorColour): string {
  return `${colour} — Vertical 6'4″ PVC (colour sheet)`;
}
