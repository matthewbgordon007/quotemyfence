'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ESTIMATE_PUBLIC_DEMO_QUERY,
  ESTIMATE_PUBLIC_DEMO_STORAGE_KEY,
  isEstimatePublicDemoQuery,
} from '@/lib/public-demo';

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

export function EstimatePublicDemoHomeButton() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isEstimatePublicDemoQuery(searchParams.get(ESTIMATE_PUBLIC_DEMO_QUERY))) {
      setShow(true);
      return;
    }
    try {
      setShow(sessionStorage.getItem(ESTIMATE_PUBLIC_DEMO_STORAGE_KEY) === '1');
    } catch {
      setShow(false);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
    >
      ← Back to homepage
    </Link>
  );
}
