/**
 * Central SEO config and helpers for metadata, canonical URLs, and JSON-LD.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.quotemyfence.ca';

export const SEO_DEFAULTS = {
  siteName: 'QuoteMyFence',
  title: 'QuoteMyFence | #1 Fence Estimate Software for Contractors | Instant Quotes & Lead Capture',
  description:
    'The #1 fence estimate software. Turn tire-kickers into ready-to-buy leads. Instant quotes, satellite mapping, 24/7 lead capture. Trusted by fence contractors across Canada. Try free.',
  keywords: [
    'fence estimate software',
    'fence quote software',
    'fence contractor software',
    'fence quoting software canada',
    'fence estimating app',
    'fence quote tool for contractors',
    'instant fence estimate',
    'fence quote calculator',
    'fence lead generation',
    'fence estimate tool',
    'satellite fence mapping',
    'fence contractor leads',
    'fence sales software',
    'contractor lead capture software',
    'fence business growth',
    'Canada fence software',
    'fence business software',
    'quote my fence',
  ],
  openGraph: {
    type: 'website' as const,
    locale: 'en_CA',
    siteName: 'QuoteMyFence',
    images: [
      {
        url: `${SITE_URL}/QuoteMyFence.png`,
        width: 1200,
        height: 630,
        alt: 'QuoteMyFence fence estimate software platform preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    site: '@quotemyfence',
  },
  organization: {
    name: 'QuoteMyFence',
    url: SITE_URL,
    logo: `${SITE_URL}/quotemyfence-logo.png`,
    description: 'The #1 fence estimate software for contractors. Instant quotes, satellite mapping, 24/7 lead capture.',
    email: 'info@quotemyfence.ca',
    foundingDate: '2024',
    sameAs: [] as string[],
  },
};

export function canonical(path: string): string {
  const base = SITE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
