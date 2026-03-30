export type LengthTier = { minFt: number; maxFt: number | null };

/**
 * Parses range labels like:
 * - "8' - 24'"
 * - "801'+"
 * - "801' + (Special order)"
 */
export function parseLengthTier(label: string): LengthTier | null {
  const s = label.replace(/\s+/g, ' ').trim();
  const between = s.match(/(\d+(?:\.\d+)?)\s*'\s*-\s*(\d+(?:\.\d+)?)\s*'/);
  if (between) {
    const minFt = Number(between[1]);
    const maxFt = Number(between[2]);
    if (!Number.isFinite(minFt) || !Number.isFinite(maxFt) || maxFt < minFt) return null;
    return { minFt, maxFt };
  }
  const plus = s.match(/(\d+(?:\.\d+)?)\s*'\s*\+/);
  if (plus) {
    const minFt = Number(plus[1]);
    if (!Number.isFinite(minFt)) return null;
    return { minFt, maxFt: null };
  }
  return null;
}

export function isLengthInTier(lengthFt: number, tier: LengthTier): boolean {
  if (lengthFt < tier.minFt) return false;
  if (tier.maxFt == null) return true;
  return lengthFt <= tier.maxFt;
}

export function pickBestTierByLength<T extends { styleName: string }>(
  rows: T[],
  lengthFt: number
): T | null {
  const candidates = rows
    .map((row) => ({ row, tier: parseLengthTier(row.styleName) }))
    .filter((x): x is { row: T; tier: LengthTier } => !!x.tier)
    .filter((x) => isLengthInTier(lengthFt, x.tier));

  if (!candidates.length) return null;

  // Prefer tighter upper-bounded ranges first, then larger min threshold.
  candidates.sort((a, b) => {
    const spanA = a.tier.maxFt == null ? Number.POSITIVE_INFINITY : a.tier.maxFt - a.tier.minFt;
    const spanB = b.tier.maxFt == null ? Number.POSITIVE_INFINITY : b.tier.maxFt - b.tier.minFt;
    if (spanA !== spanB) return spanA - spanB;
    return b.tier.minFt - a.tier.minFt;
  });

  return candidates[0].row;
}

export type InstallLengthTierRow = {
  min_ft: number;
  max_ft: number | null;
};

/**
 * Picks the best pricing tier from explicit min/max ft rows (database tiers).
 * Same tie-break as name-based tiers: tightest span, then higher min threshold.
 */
export function pickBestTierByInstallLength<T extends InstallLengthTierRow>(
  rows: T[],
  lengthFt: number
): T | null {
  if (!rows.length || !Number.isFinite(lengthFt)) return null;

  const candidates = rows.filter((r) => {
    const min = Number(r.min_ft);
    const max = r.max_ft == null ? null : Number(r.max_ft);
    if (!Number.isFinite(min)) return false;
    if (lengthFt < min) return false;
    if (max == null) return true;
    return lengthFt <= max;
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const minA = Number(a.min_ft);
    const minB = Number(b.min_ft);
    const maxA = a.max_ft == null ? null : Number(a.max_ft);
    const maxB = b.max_ft == null ? null : Number(b.max_ft);
    const spanA = maxA == null ? Number.POSITIVE_INFINITY : maxA - minA;
    const spanB = maxB == null ? Number.POSITIVE_INFINITY : maxB - minB;
    if (spanA !== spanB) return spanA - spanB;
    return minB - minA;
  });

  return candidates[0];
}
