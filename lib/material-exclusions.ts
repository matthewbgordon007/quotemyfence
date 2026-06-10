/** Material calculator tab ids used for per-item exclusion keys. */
export type MaterialCalcTab = 'pvc' | 'chain' | 'hybrid_h' | 'hybrid_v';

/** `true` = excluded from order list, PDF, and supplier quotes. */
export type MaterialExclusions = Record<string, true>;

export function normalizeMaterialLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[\u2013\u2014\-–—]/g, ' ')
    .replace(/[^\w\s()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonical PVC material group — breakdown rows (e.g. "Plug", "Gate — Plug") and master rows
 * (e.g. "Hole Plug", "H-Post") map to the same id so Include toggles stay in sync.
 */
export function pvcMaterialExclusionGroup(label: string): string {
  const n = normalizeMaterialLabel(label);
  if (!n) return n;

  if (n.includes('gate') && (n.includes('width') || n.includes('linear'))) return 'gate_linear';
  if (n === 'panels') return 'panels';
  if (n === 'concrete') return 'concrete';
  if (n === 'post filler') return 'post_filler';
  if (n === 'base plates') return 'base_plates';
  if (n.includes('lattice')) return 'lattice';
  if (n.includes('drop rod') || n.includes('sleeve')) return 'drop_rod';

  const isGate = n.startsWith('gate ');
  const rest = isGate ? n.slice(5).trim() : n;

  if (rest === 'plug' || n === 'hole plug') return 'plug';
  if (rest === 'long screw' || n === 'large screw') return 'long_screw';
  if (rest === 'short screw') return 'short_screw';
  if (rest === 'galvanized post') return 'galvanized_post';
  if (rest === 'h post' || rest.startsWith('h post ')) return 'h_post';
  if (rest.startsWith('cap') || n === 'post cap') return 'post_cap';
  if (rest === 'rail' || (isGate && rest.startsWith('rail'))) return 'rail';
  if (rest.includes('rail stiffener')) return 'rail_stiffener';
  if (rest === 'board' || (isGate && rest.startsWith('board ') && !rest.includes('stiffener'))) return 'board';
  if (rest.includes('board stiffener')) return 'board_stiffener';
  if (rest.includes('u channel') || n === 'u channel') return 'u_channel';
  if (rest.includes('h post stiffener')) return 'h_post_stiffener';
  if (rest.includes('cross brace') || n.includes('diagonal brace')) return 'diagonal_brace';
  if (rest.includes('overhead brace') || rest.includes('over head brace')) return 'overhead_brace';
  if (rest.includes('latch')) return 'latch';
  if (rest.includes('hinge')) return 'hinge';

  if (n === 'h post') return 'h_post';
  if (n === 'plug') return 'plug';
  if (n === 'long screw') return 'long_screw';
  if (n === 'short screw') return 'short_screw';
  if (n === 'galvanized post') return 'galvanized_post';
  if (n.startsWith('cap ')) return 'post_cap';
  if (n === 'rail') return 'rail';
  if (n.includes('rail stiffener')) return 'rail_stiffener';
  if (n === 'board') return 'board';
  if (n.includes('board stiffener')) return 'board_stiffener';
  if (n.includes('u channel')) return 'u_channel';
  if (n.includes('h post stiffener')) return 'h_post_stiffener';

  return n.replace(/\s+/g, '_');
}

export function materialExclusionKey(tab: MaterialCalcTab, label: string): string {
  if (tab === 'pvc') {
    return `pvc:${pvcMaterialExclusionGroup(label)}`;
  }
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
export function postRelatedMaterialLabels(tab: MaterialCalcTab, labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of labels) {
    const key = tab === 'pvc' ? pvcMaterialExclusionGroup(l) : normalizeMaterialLabel(l);
    const isPost =
      tab === 'pvc' ? key === 'concrete' || key.includes('post') : key.includes('post') || key.includes('concrete');
    if (!isPost) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

function migrateExclusionKey(key: string): string {
  const colon = key.indexOf(':');
  if (colon < 0) return key;
  const tab = key.slice(0, colon) as MaterialCalcTab;
  const labelPart = key.slice(colon + 1);
  if (tab === 'pvc') {
    return `pvc:${pvcMaterialExclusionGroup(labelPart)}`;
  }
  return `${tab}:${normalizeMaterialLabel(labelPart)}`;
}

export function parseMaterialExclusions(raw: unknown): MaterialExclusions {
  if (!raw || typeof raw !== 'object') return {};
  const out: MaterialExclusions = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && v === true) {
      out[migrateExclusionKey(k)] = true;
    }
  }
  return out;
}
