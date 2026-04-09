/** Query param used to persist quote session across reload and back navigation */
export const ESTIMATE_SESSION_QUERY = 's';

/** Start a fresh quote flow (handled on contact step; must be stripped after reset or it re-runs forever) */
export const ESTIMATE_NEW_QUOTE_QUERY = 'new';

export function estimateStepPath(
  slug: string,
  step: string,
  sessionId: string | null | undefined
): string {
  const base = `/estimate/${encodeURIComponent(slug)}/${step}`;
  if (!sessionId) return base;
  return `${base}?${ESTIMATE_SESSION_QUERY}=${encodeURIComponent(sessionId)}`;
}
