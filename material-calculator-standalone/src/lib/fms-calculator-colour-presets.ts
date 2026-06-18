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
