import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contractor login',
  description: 'Sign in to your QuoteMyFence contractor dashboard. Manage products, pricing, and quote requests.',
  robots: 'noindex',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
