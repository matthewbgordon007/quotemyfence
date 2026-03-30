'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Supabase Storage and other remote URLs: use native <img> so we do not depend on
 * next/image remotePatterns (wildcard hostnames are unreliable) or the optimizer.
 */
function isStorageOrRemoteBlobUrl(src: string): boolean {
  if (src.startsWith('blob:') || src.startsWith('data:')) return true;
  try {
    const u = new URL(src);
    return u.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
}

/** Renders product/style/colour photos with high quality for screenshots. */
export function OptimizedProductImage({
  src,
  alt,
  fill,
  className = '',
  sizes = '256px',
  priority = false,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src) {
    return null;
  }

  if (failed) {
    return (
      <div
        className={
          fill
            ? `absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 ${className}`
            : `flex h-[300px] w-[400px] max-w-full items-center justify-center bg-slate-100 text-xs text-slate-400 ${className}`
        }
      >
        Image unavailable
      </div>
    );
  }

  if (isStorageOrRemoteBlobUrl(src)) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        width={400}
        height={300}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        quality={95}
        onError={() => setFailed(true)}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      className={className}
      sizes={sizes}
      quality={95}
      onError={() => setFailed(true)}
      priority={priority}
    />
  );
}
