import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contractor sign up',
  description: 'Create your QuoteMyFence contractor account. Start managing fence estimates, products, pricing, and leads.',
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
