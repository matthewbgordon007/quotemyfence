import { SITE_URL } from '@/lib/seo';

/**
 * Slug for the public try-before-signup estimate flow.
 * Override with NEXT_PUBLIC_DEMO_CONTRACTOR_SLUG if your demo contractor uses another slug.
 */
export const PUBLIC_DEMO_CONTRACTOR_SLUG =
  (process.env.NEXT_PUBLIC_DEMO_CONTRACTOR_SLUG || 'gordon-landscaping').trim() ||
  'gordon-landscaping';

/** Query param on marketing “Try demo” links — not used on contractors’ own quote URLs. */
export const ESTIMATE_PUBLIC_DEMO_QUERY = 'demo';

export const ESTIMATE_PUBLIC_DEMO_VALUE = '1';

/** sessionStorage flag set when the visitor lands with `?demo=1`. */
export const ESTIMATE_PUBLIC_DEMO_STORAGE_KEY = 'qm_estimate_public_demo';

export function isEstimatePublicDemoQuery(
  value: string | null | undefined
): boolean {
  return value === ESTIMATE_PUBLIC_DEMO_VALUE;
}

/** Relative path to the demo contact step (works on any deployment host). */
export function publicDemoEstimateContactPath(): string {
  return `/estimate/${encodeURIComponent(PUBLIC_DEMO_CONTRACTOR_SLUG)}/contact?${ESTIMATE_PUBLIC_DEMO_QUERY}=${ESTIMATE_PUBLIC_DEMO_VALUE}`;
}

/** Absolute URL for marketing / blog / external links. */
export function publicDemoEstimateContactUrl(): string {
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}${publicDemoEstimateContactPath()}`;
}
