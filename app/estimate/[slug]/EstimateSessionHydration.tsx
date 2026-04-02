'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ESTIMATE_SESSION_QUERY } from '@/lib/estimate-session-url';
import { useEstimate } from './EstimateContext';

export function EstimateSessionHydration({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const { hydrateFromServer } = useEstimate();
  const hydratedSidRef = useRef<string | null>(null);
  const failedSidRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sid = searchParams.get(ESTIMATE_SESSION_QUERY);
    if (!sid) {
      hydratedSidRef.current = null;
      failedSidRef.current = null;
      return;
    }
    if (hydratedSidRef.current === sid) return;
    if (failedSidRef.current === sid) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/public/quote-session/${encodeURIComponent(sid)}?slug=${encodeURIComponent(slug)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          failedSidRef.current = sid;
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        hydrateFromServer({
          sessionId: data.sessionId,
          contact: data.contact,
          property: data.property,
          drawing: data.drawing,
          hasRemoval: !!data.hasRemoval,
          selectedProductOptionId: data.selectedProductOptionId ?? null,
          selectedColourOptionId: data.selectedColourOptionId ?? null,
          totals: data.totals ?? null,
        });
        hydratedSidRef.current = sid;
        failedSidRef.current = null;
      } catch {
        failedSidRef.current = sid;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, slug, hydrateFromServer]);

  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center bg-white/50 pt-24 backdrop-blur-[2px]">
      <p className="rounded-full border border-[var(--line)] bg-white/95 px-4 py-2 text-sm font-medium text-slate-600 shadow-lg">
        Restoring your quote…
      </p>
    </div>
  );
}
