'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ESTIMATE_PUBLIC_DEMO_QUERY,
  ESTIMATE_PUBLIC_DEMO_STORAGE_KEY,
  PUBLIC_DEMO_BOOK_CALL_URL,
  isEstimatePublicDemoQuery,
} from '@/lib/public-demo';

/**
 * True when the visitor arrived via a marketing "Try demo" link.
 * Detected from `?demo=1` on first load, then remembered in sessionStorage so
 * it survives step navigation (which only carries the `?s=` session param).
 */
export function useIsPublicDemo(): boolean {
  const searchParams = useSearchParams();
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isEstimatePublicDemoQuery(searchParams.get(ESTIMATE_PUBLIC_DEMO_QUERY))) {
      try {
        sessionStorage.setItem(ESTIMATE_PUBLIC_DEMO_STORAGE_KEY, '1');
      } catch {
        /* private mode / blocked storage */
      }
      setIsDemo(true);
      return;
    }
    try {
      setIsDemo(sessionStorage.getItem(ESTIMATE_PUBLIC_DEMO_STORAGE_KEY) === '1');
    } catch {
      setIsDemo(false);
    }
  }, [searchParams]);

  return isDemo;
}

/** Remember marketing-demo entry so the flag survives step navigation (`?s=` session param). */
export function EstimatePublicDemoTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isEstimatePublicDemoQuery(searchParams.get(ESTIMATE_PUBLIC_DEMO_QUERY))) return;
    try {
      sessionStorage.setItem(ESTIMATE_PUBLIC_DEMO_STORAGE_KEY, '1');
    } catch {
      /* private mode / blocked storage */
    }
  }, [searchParams]);

  return null;
}

/**
 * Floating action panel shown only during a marketing demo. Offers the three
 * conversion paths: book a call, sign up, or return to the homepage.
 */
export function EstimatePublicDemoFloatingCta() {
  const isDemo = useIsPublicDemo();
  const [open, setOpen] = useState(false);

  if (!isDemo) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open && (
        <div className="flex w-56 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-400/30">
          <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            You&apos;re in a live demo
          </div>
          <a
            href={PUBLIC_DEMO_BOOK_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
            </svg>
            Book a call with us
          </a>
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Sign up
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
            </svg>
            Return to homepage
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/30 transition hover:bg-slate-800"
      >
        {open ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
        {open ? 'Close' : 'Like this? Get it'}
      </button>
    </div>
  );
}
