'use client';

import Image from 'next/image';
import { useState } from 'react';

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
  const [error, setError] = useState(false);

  if (!src) {
    return null;
  }

  const unopt = src.startsWith('blob:') || src.startsWith('data:') || src.includes('supabase.co/storage');

  // Next/Image error fallback: plain <img> must still fill the parent when `fill` was used, or the box collapses to 0×0.
  if (error) {
    return fill ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} loading="lazy" decoding="async" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} width={400} height={300} loading="lazy" decoding="async" />
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
        unoptimized={unopt}
        onError={() => setError(true)}
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
      unoptimized={unopt}
      onError={() => setError(true)}
      priority={priority}
    />
  );
}
