import type { GoogleSheetsEmbedMode } from '@/lib/supplier-embed-calculator-urls';
import { buildGoogleSheetsEmbedUrl, sanitizeExcelOfficeEmbedUrl } from '@/lib/supplier-embed-calculator-urls';

export const EMBED_CALC_CONFIG_VERSION = 1 as const;

export type SupplierEmbedCalculatorConfigV1 = {
  version: typeof EMBED_CALC_CONFIG_VERSION;
  googlePasted: string;
  excelPasted: string;
  active: 'google' | 'excel';
  googleSheetsMode: GoogleSheetsEmbedMode;
};

const MAX_URL_LEN = 12000;

export function defaultEmbedCalculatorConfig(): SupplierEmbedCalculatorConfigV1 {
  return {
    version: EMBED_CALC_CONFIG_VERSION,
    googlePasted: '',
    excelPasted: '',
    active: 'google',
    googleSheetsMode: 'fullEdit',
  };
}

export function parseEmbedCalculatorConfig(raw: unknown): SupplierEmbedCalculatorConfigV1 {
  if (!raw || typeof raw !== 'object') return defaultEmbedCalculatorConfig();
  const o = raw as Record<string, unknown>;
  const mode: GoogleSheetsEmbedMode =
    o.googleSheetsMode === 'compact' || o.googleSheetsMode === 'fullEdit' ? o.googleSheetsMode : 'fullEdit';
  return {
    version: EMBED_CALC_CONFIG_VERSION,
    googlePasted: typeof o.googlePasted === 'string' ? o.googlePasted.slice(0, MAX_URL_LEN) : '',
    excelPasted: typeof o.excelPasted === 'string' ? o.excelPasted.slice(0, MAX_URL_LEN) : '',
    active: o.active === 'excel' ? 'excel' : 'google',
    googleSheetsMode: mode,
  };
}

export type EmbedConfigValidation = { ok: true; config: SupplierEmbedCalculatorConfigV1 } | { ok: false; error: string };

/** Ensure pasted URLs are valid when non-empty (same rules as the embed UI). */
export function validateEmbedCalculatorConfig(c: SupplierEmbedCalculatorConfigV1): EmbedConfigValidation {
  const google = c.googlePasted.trim();
  const excel = c.excelPasted.trim();
  if (google && !buildGoogleSheetsEmbedUrl(google, c.googleSheetsMode).ok) {
    return { ok: false, error: 'Google Sheets URL is not valid for embedding.' };
  }
  if (excel && !sanitizeExcelOfficeEmbedUrl(excel).ok) {
    return { ok: false, error: 'Excel embed URL is not valid.' };
  }
  return { ok: true, config: c };
}
