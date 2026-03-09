'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Contractor login</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sign in to manage your products, pricing, and quote requests.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[var(--accent)] py-3 font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          New contractor?{' '}
          <Link href="/signup" className="font-semibold text-[var(--accent)] hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-1 text-center text-sm text-[var(--muted)]">
          <Link href="/" className="hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
