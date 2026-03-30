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
