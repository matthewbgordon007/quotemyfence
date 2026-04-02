'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ESTIMATE_SESSION_QUERY, estimateStepPath } from '@/lib/estimate-session-url';
import {
  collectDesignImageUrlsFromHierarchy,
  preloadDesignProductImages,
} from '@/lib/estimate-design-image-preload';
import { useEstimate } from '../EstimateContext';

/** Minimum time on this screen so the message feels intentional (ms). */
const MIN_MS_WITH_IMAGES = 2600;
const MIN_MS_NO_IMAGES = 1400;
/** If the session is still hydrating, don’t send the user back to draw too soon. */
const HYDRATE_DRAW_BAIL_MS = 10000;

export default function DesignPreloadPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { config, state } = useEstimate();
  const hierarchy = config.productHierarchy;
  const hasHierarchy = hierarchy && hierarchy.fenceTypes?.length > 0;
  const [hint, setHint] = useState('Please wait while we load fence options…');

  useEffect(() => {
    let cancelled = false;
    const sessionFromUrl = searchParams.get(ESTIMATE_SESSION_QUERY);
    const drawing = state.drawing;
    const drawingOk = drawing != null && drawing.points.length >= 2;

    if (!drawingOk) {
      if (sessionFromUrl) {
        const bail = window.setTimeout(() => {
          if (cancelled) return;
          router.replace(estimateStepPath(slug, 'draw', sessionFromUrl));
        }, HYDRATE_DRAW_BAIL_MS);
        return () => {
          cancelled = true;
          window.clearTimeout(bail);
        };
      }
      router.replace(estimateStepPath(slug, 'draw', state.sessionId));
      return () => {
        cancelled = true;
      };
    }

    const urls = hasHierarchy ? collectDesignImageUrlsFromHierarchy(hierarchy) : [];
    const minMs = urls.length > 0 ? MIN_MS_WITH_IMAGES : MIN_MS_NO_IMAGES;
    if (urls.length > 0) {
      setHint('Please wait while product photos load…');
    }

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, minMs));
    const preload = preloadDesignProductImages(urls);

    Promise.all([minDelay, preload]).then(() => {
      if (cancelled) return;
      router.replace(estimateStepPath(slug, 'design', state.sessionId));
    });

    return () => {
      cancelled = true;
    };
  }, [hasHierarchy, hierarchy, router, searchParams, slug, state.drawing, state.sessionId]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6 py-16">
      <div
        className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-white/95 shadow-xl shadow-slate-200/50 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
        <div className="p-10 text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--line)] border-t-[var(--accent)]"
            aria-hidden
          />
          <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-800">Almost there</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{hint}</p>
          <p className="mt-4 text-xs text-slate-500">This helps photos appear instantly when you pick styles and colours.</p>
        </div>
      </div>
    </div>
  );
}
