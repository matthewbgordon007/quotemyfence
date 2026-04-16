/**
 * Imported supplier types are currently named like:
 *   "WPC 6' (Canadian Fence Material Supply)"
 * Keep supplier source visible internally, but hide for homeowner-facing screens.
 */
export function extractSupplierFromTypeName(typeName: string): {
  baseName: string;
  supplierName: string | null;
} {
  const raw = String(typeName || '').trim();
  const m = raw.match(/^(.*)\s+\(([^()]+)\)\s*$/);
  if (!m) return { baseName: raw, supplierName: null };
  return {
    baseName: m[1].trim(),
    supplierName: m[2].trim() || null,
  };
}

export function stripSupplierFromTypeName(typeName: string): string {
  return extractSupplierFromTypeName(typeName).baseName;
}
