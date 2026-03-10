'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PRICE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '';
const PRICE_YEARLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || '';
const LABEL_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_LABEL_MONTHLY || 'Monthly';
const LABEL_YEARLY = process.env.NEXT_PUBLIC_STRIPE_LABEL_YEARLY || 'Yearly (save 2 months)';

export default function PaywallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/contractor/me')
      .then((res) => {
        if (res.status === 401) {
          router.replace('/login');
          return null;
        }
        if (res.status === 403) {
          router.replace('/dashboard');
          return null;
        }
        return res.json();
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCheckout(priceId: string) {
    setError(null);
    setCheckoutLoading(priceId);

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to start checkout');
        setCheckoutLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL received');
        setCheckoutLoading(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 block transition-opacity hover:opacity-90">
        <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto" />
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Choose your plan</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          7-day free trial. Cancel anytime. Full access to your dashboard, products, leads, and quote builder.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-8 space-y-4">
          {PRICE_MONTHLY && (
            <button
              type="button"
              onClick={() => handleCheckout(PRICE_MONTHLY)}
              disabled={!!checkoutLoading}
              className="flex w-full items-center justify-between rounded-xl border-2 border-[var(--line)] bg-white px-6 py-4 text-left font-medium transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 disabled:opacity-60"
            >
              <div>
                <div>{LABEL_MONTHLY}</div>
                <div className="text-xs text-[var(--muted)]">Billed monthly</div>
              </div>
              {checkoutLoading === PRICE_MONTHLY ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              ) : (
                <span className="text-[var(--accent)]">Select →</span>
              )}
            </button>
          )}

          {PRICE_YEARLY && (
            <button
              type="button"
              onClick={() => handleCheckout(PRICE_YEARLY)}
              disabled={!!checkoutLoading}
              className="flex w-full items-center justify-between rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)]/5 px-6 py-4 text-left font-medium transition hover:bg-[var(--accent)]/10 disabled:opacity-60"
            >
              <div>
                <div>{LABEL_YEARLY}</div>
                <div className="text-xs text-[var(--muted)]">Billed annually</div>
              </div>
              {checkoutLoading === PRICE_YEARLY ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              ) : (
                <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-semibold text-white">
                  Best value
                </span>
              )}
            </button>
          )}
        </div>

        {!PRICE_MONTHLY && !PRICE_YEARLY && (
          <p className="mt-6 text-center text-sm text-amber-600">
            Stripe price IDs are not configured. Add NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY and/or
            NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY to your environment.
          </p>
        )}

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Secure payment powered by Stripe. You can manage or cancel your subscription anytime.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="mt-8 text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
