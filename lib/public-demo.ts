import { SITE_URL } from '@/lib/seo';

/**
 * Slug for the public try-before-signup estimate flow.
 * Override with NEXT_PUBLIC_DEMO_CONTRACTOR_SLUG if your demo contractor uses another slug.
 */
export const PUBLIC_DEMO_CONTRACTOR_SLUG =
  (process.env.NEXT_PUBLIC_DEMO_CONTRACTOR_SLUG || 'gordon-landscaping').trim() ||
  'gordon-landscaping';

/** Relative path to the demo contact step (works on any deployment host). */
export function publicDemoEstimateContactPath(): string {
  return `/estimate/${encodeURIComponent(PUBLIC_DEMO_CONTRACTOR_SLUG)}/contact`;
}

/** Absolute URL for marketing / blog / external links. */
export function publicDemoEstimateContactUrl(): string {
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}${publicDemoEstimateContactPath()}`;
}
