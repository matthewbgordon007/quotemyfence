'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-6 block w-fit rounded-xl bg-black p-1.5 transition-opacity hover:opacity-90"
      >
        <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter the email you use to sign in. If we find an account, we will send a link to reset
          your password.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Check your inbox for an email from us. Open the link inside to choose a new password.
            If you do not see it, check spam or promotions.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              className="rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[var(--accent)] py-3 font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
