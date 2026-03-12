'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function CustomersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Customers section error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
      <h2 className="text-lg font-semibold text-[var(--text)]">Something went wrong</h2>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">Unable to load customer details.</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/dashboard/customers"
          className="rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg2)]"
        >
          Back to customers
        </Link>
      </div>
    </div>
  );
}
