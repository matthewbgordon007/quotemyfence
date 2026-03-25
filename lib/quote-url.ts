import { SITE_URL } from '@/lib/seo';

export function slugifyQuoteSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Public quote page URL. `/estimate/{slug}` redirects to the contact step.
 */
export function contractorQuotePageUrl(rawSlug: string, siteBase?: string): string | null {
  const s = slugifyQuoteSlug(rawSlug.trim());
  if (!s) return null;
  const base = (siteBase ?? SITE_URL.replace(/\/$/, '')).replace(/\/$/, '');
  return `${base}/estimate/${encodeURIComponent(s)}`;
}
