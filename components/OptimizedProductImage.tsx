'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildSupabaseRenderUrl } from '@/lib/supabase-product-image-url';

/**
 * Product/style/colour photos — always native <img>.
 * next/image + remotePatterns caused blank thumbnails for many Supabase URLs.
 */
export function OptimizedProductImage({
  src,
  alt,
  fill,
  className = '',
  priority = false,
  fetchPriority,
  preferredWidth,
  preferredQuality = 72,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  preferredWidth?: number;
  preferredQuality?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const clean = typeof src === 'string' ? src.trim() : '';
  const transformed = useMemo(
    () => (clean ? buildSupabaseRenderUrl(clean, preferredWidth, preferredQuality) : null),
    [clean, preferredWidth, preferredQuality]
  );
  const [activeSrc, setActiveSrc] = useState<string>(transformed || clean);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setActiveSrc(transformed || clean);
  }, [clean, transformed]);

  if (!clean || failed) {
    if (!clean) return null;
    return (
      <div
        className={
          fill
            ? `absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-slate-500 ${className}`
            : `flex h-[300px] w-[400px] max-w-full items-center justify-center bg-slate-100 text-xs text-slate-500 ${className}`
        }
      >
        Image unavailable
      </div>
    );
  }

  if (fill) {
    return (
      <div className="absolute inset-0 overflow-hidden p-0.5">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse rounded-md bg-slate-100" />
        )}
        <div className="absolute inset-0 flex min-h-0 min-w-0 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeSrc}
          alt={alt}
          className={`max-h-full max-w-full min-h-0 min-w-0 transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={fetchPriority ?? (priority ? 'high' : 'auto')}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (activeSrc !== clean && clean) {
              setLoaded(false);
              setActiveSrc(clean);
              return;
            }
            setFailed(true);
          }}
        />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse rounded-md bg-slate-100" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeSrc}
        alt={alt}
        width={400}
        height={300}
        className={`transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={fetchPriority ?? (priority ? 'high' : 'auto')}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (activeSrc !== clean && clean) {
            setLoaded(false);
            setActiveSrc(clean);
            return;
          }
          setFailed(true);
        }}
      />
    </div>
  );
}
