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

  if (error || !src) {
    return (
      <img src={src || ''} alt={alt} className={className} />
    );
  }

  const unopt = src.startsWith('blob:') || src.startsWith('data:');

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
