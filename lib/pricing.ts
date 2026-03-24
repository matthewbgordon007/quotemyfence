/**
 * Server-side pricing engine.
 * Contractor sets single prices. Customer sees ±10% range on their quote.
 * Input: total_length_ft, product_option_id, gate counts, has_removal, pricing_rules.
 * Output: { subtotal_low, subtotal_high, total_low, total_high } (±10% of actual).
 */

const QUOTE_RANGE_PCT = 0.1; // ±10%
const DEFAULT_ESTIMATE_TAX_RATE = Number(process.env.ESTIMATE_TAX_RATE ?? 13); // %

export interface PricingRuleRow {
  base_price_per_ft_low: number;
  base_price_per_ft_high: number;
  single_gate_low: number;
  single_gate_high: number;
  double_gate_low: number;
  double_gate_high: number;
  removal_price_per_ft_low: number;
  removal_price_per_ft_high: number;
  minimum_job_low: number;
  minimum_job_high: number;
  tax_mode: string;
}

export interface PricingInput {
  total_length_ft: number;
  product_option_id: string;
  single_gate_qty: number;
  double_gate_qty: number;
  has_removal: boolean;
  rule: PricingRuleRow;
}

export interface PricingResult {
  subtotal_low: number;
  subtotal_high: number;
  tax_low: number;
  tax_high: number;
  total_low: number;
  total_high: number;
  breakdown?: {
    material_low: number;
    material_high: number;
    gates_low: number;
    gates_high: number;
    removal_low: number;
    removal_high: number;
  };
}

export function calculatePricing(input: PricingInput): PricingResult {
  const {
    total_length_ft,
    single_gate_qty,
    double_gate_qty,
    has_removal,
    rule,
  } = input;

  const length = Math.max(0, Number(total_length_ft) || 0);
  const singleQty = Math.max(0, Math.floor(Number(single_gate_qty) || 0));
  const doubleQty = Math.max(0, Math.floor(Number(double_gate_qty) || 0));

  // Contractor sets single prices; we use _low (same as _high when contractor uses single-value)
  const pricePerFt = (rule.base_price_per_ft_low + rule.base_price_per_ft_high) / 2 || rule.base_price_per_ft_low || 0;
  const singleGate = ((rule.single_gate_low || 0) + (rule.single_gate_high || 0)) / 2 || rule.single_gate_low || 0;
  const doubleGate = ((rule.double_gate_low || 0) + (rule.double_gate_high || 0)) / 2 || rule.double_gate_low || 0;
  const removalPerFt = (rule.removal_price_per_ft_low || 0);
  const minJob = (rule.minimum_job_low + rule.minimum_job_high) / 2 || rule.minimum_job_low || 0;

  const material = length * pricePerFt;
  const gates = singleQty * singleGate + doubleQty * doubleGate;
  const removal = has_removal && length > 0 ? length * removalPerFt : 0;
  const subtotalActual = Math.max(material + gates + removal, minJob);

  const range = subtotalActual * QUOTE_RANGE_PCT;
  const subtotal_low = Math.round((subtotalActual - range) * 100) / 100;
  const subtotal_high = Math.round((subtotalActual + range) * 100) / 100;
  const taxRate = Number.isFinite(DEFAULT_ESTIMATE_TAX_RATE)
    ? Math.max(0, DEFAULT_ESTIMATE_TAX_RATE)
    : 13;
  const applyTax = (rule.tax_mode ?? 'excluded') !== 'included' && taxRate > 0;
  const tax_low = applyTax ? Math.round(subtotal_low * (taxRate / 100) * 100) / 100 : 0;
  const tax_high = applyTax ? Math.round(subtotal_high * (taxRate / 100) * 100) / 100 : 0;
  const total_low = Math.round((subtotal_low + tax_low) * 100) / 100;
  const total_high = Math.round((subtotal_high + tax_high) * 100) / 100;

  return {
    subtotal_low,
    subtotal_high,
    tax_low,
    tax_high,
    total_low,
    total_high,
    breakdown: {
      material_low: Math.round(material * 100) / 100,
      material_high: Math.round(material * 100) / 100,
      gates_low: Math.round(gates * 100) / 100,
      gates_high: Math.round(gates * 100) / 100,
      removal_low: Math.round(removal * 100) / 100,
      removal_high: Math.round(removal * 100) / 100,
    },
  };
}
