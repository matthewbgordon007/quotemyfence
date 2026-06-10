/** Material calculator tab ids used for per-item exclusion keys. */
export type MaterialCalcTab = 'pvc' | 'chain' | 'hybrid_h' | 'hybrid_v';

/** `true` = excluded from order list, PDF, and supplier quotes. */
export type MaterialExclusions = Record<string, true>;

export function normalizeMaterialLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

export function materialExclusionKey(tab: MaterialCalcTab, label: string): string {
  return `${tab}:${normalizeMaterialLabel(label)}`;
}

export function isMaterialIncluded(
  exclusions: MaterialExclusions,
  tab: MaterialCalcTab,
  label: string
): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;
  return exclusions[materialExclusionKey(tab, trimmed)] !== true;
}

export function toggleMaterialExclusion(
  exclusions: MaterialExclusions,
  tab: MaterialCalcTab,
  label: string,
  included: boolean
): MaterialExclusions {
  const key = materialExclusionKey(tab, label);
  if (included) {
    const next = { ...exclusions };
    delete next[key];
    return next;
  }
  return { ...exclusions, [key]: true };
}

export function excludeMaterialLabels(
  exclusions: MaterialExclusions,
  tab: MaterialCalcTab,
  labels: string[]
): MaterialExclusions {
  let next = { ...exclusions };
  for (const label of labels) {
    if (!label.trim()) continue;
    next[materialExclusionKey(tab, label)] = true;
  }
  return next;
}

/** Labels that look like posts / concrete — for "customer already has posts" quick action. */
export function postRelatedMaterialLabels(labels: string[]): string[] {
  return labels.filter((l) => {
    const n = normalizeMaterialLabel(l);
    return n.includes('post') || n.includes('concrete');
  });
}

export function parseMaterialExclusions(raw: unknown): MaterialExclusions {
  if (!raw || typeof raw !== 'object') return {};
  const out: MaterialExclusions = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && v === true) out[k] = true;
  }
  return out;
}
