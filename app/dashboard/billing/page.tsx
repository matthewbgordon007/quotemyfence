'use client';

import { useEffect, useState } from 'react';

type BillingState = {
  status: string | null;
  company_name: string;
  billing_active: boolean;
  current_period_end: string | null;
  trial_ends_at: string | null;
  has_customer: boolean;
};

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<BillingState | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/stripe/subscription-status', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Unable to load billing status');
      setLoading(false);
      return;
    }
    setState(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data.error || 'Unable to start checkout');
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start checkout');
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data.error || 'Unable to open billing portal');
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open billing portal');
      setBusy(false);
    }
  }

  const priceLabel = '$199.99 / month';

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activate your subscription</h1>
        <p className="mt-2 text-sm text-slate-600">
          Start a 7-day free trial, then continue at {priceLabel}. Access is locked until billing is active.
        </p>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading billing status...
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Account:</span> {state?.company_name || 'Your company'}
            </div>
            <div className="mt-1 text-sm text-slate-700">
              <span className="font-semibold">Stripe status:</span> {state?.status || 'none'}
            </div>
            {state?.trial_ends_at ? (
              <div className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">Trial ends:</span>{' '}
                {new Date(state.trial_ends_at).toLocaleString()}
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {state?.billing_active ? (
            <button
              type="button"
              onClick={openPortal}
              disabled={busy}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy ? 'Opening...' : 'Manage billing'}
            </button>
          ) : (
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy || loading}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'Redirecting...' : 'Start 7-day free trial'}
            </button>
          )}
          <button
            type="button"
            onClick={loadStatus}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh status
          </button>
        </div>
      </div>
    </div>
  );
}

