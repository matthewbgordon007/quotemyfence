import type { Metadata } from 'next';
import { canonical, SEO_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Start Free Trial | Fence Estimate Software for Contractors | QuoteMyFence',
  description:
    'Create your QuoteMyFence contractor account. Set your products, pricing, and branded quote link. Capture fence leads 24/7. Try free—no credit card required.',
  keywords: ['fence contractor signup', 'fence estimate software trial', ...SEO_DEFAULTS.keywords.slice(0, 4)],
  openGraph: {
    ...SEO_DEFAULTS.openGraph,
    url: canonical('/signup'),
    title: 'Start Free Trial | Fence Estimate Software | QuoteMyFence',
    description: 'Create your contractor account. Set products, pricing, and your quote link. Capture leads 24/7.',
  },
  twitter: {
    ...SEO_DEFAULTS.twitter,
    title: 'Start Free Trial | Fence Estimate Software | QuoteMyFence',
    description: 'Create your contractor account, set pricing, and capture fence leads 24/7. No credit card required.',
  },
  alternates: { canonical: canonical('/signup') },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
