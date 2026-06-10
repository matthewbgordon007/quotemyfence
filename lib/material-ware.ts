/**
 * Master material lists are split into two groups:
 *  - Large ware: structural / bulky stock — posts, rails, boards, stiffeners,
 *    braces, U-channel, mesh rolls, gate frames, concrete, lattice…
 *  - Small ware: hardware pieces — screws, post caps, plugs, gate hardware
 *    (latches, hinges, drop rods, kits), bands, ties, hog rings, bolts, brackets…
 */
export type MaterialWare = 'large' | 'small';

export const LARGE_WARE_TITLE = 'Large ware';
export const SMALL_WARE_TITLE = 'Small ware';

const SMALL_WARE_PATTERNS: RegExp[] = [
  /screw/i,
  /\bcaps?\b/i,
  /plug/i,
  /latch/i,
  /hinge/i,
  /drop rod/i,
  /sleeve/i,
  /hardware/i,
  /\bkits?\b/i,
  /\bties?\b/i,
  /hog ring/i,
  /\bbands?\b/i,
  /bolt/i,
  /\bnuts?\b/i,
  /bracket/i,
  /plate/i,
  /rail end/i,
];

export function materialWare(label: string): MaterialWare {
  const s = String(label || '');
  return SMALL_WARE_PATTERNS.some((re) => re.test(s)) ? 'small' : 'large';
}

export function isSmallWare(label: string): boolean {
  return materialWare(label) === 'small';
}

/** Split rows into large ware then small ware, preserving the original order within each group. */
export function splitWare<T>(rows: T[], getLabel: (row: T) => string): { large: T[]; small: T[] } {
  const large: T[] = [];
  const small: T[] = [];
  for (const r of rows) (isSmallWare(getLabel(r)) ? small : large).push(r);
  return { large, small };
}
