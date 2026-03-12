'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ProductScreenshotProps {
  src: string;
  alt: string;
  fallbackLabel: string;
}

export function ProductScreenshot({ src, alt, fallbackLabel }: ProductScreenshotProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] bg-slate-50">
        <p className="text-center text-sm text-[var(--muted)]">
          Add <code className="rounded bg-slate-200 px-1.5 py-0.5">{src.replace('/images/', '')}</code> to show {fallbackLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-[var(--line)] bg-slate-100 shadow-lg">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 800px"
        onError={() => setError(true)}
      />
    </div>
  );
}
