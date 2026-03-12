'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h2 className="text-lg font-semibold text-[var(--text)]">Something went wrong</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">A client-side error occurred. Please try again.</p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
