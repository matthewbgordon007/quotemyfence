'use client';

import { useState } from 'react';

interface ProductVideoProps {
  src: string;
  fallbackLabel: string;
}

export function ProductVideo({ src, fallbackLabel }: ProductVideoProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] bg-slate-50">
        <p className="text-center text-sm text-[var(--muted)] px-4">
          Add <code className="rounded bg-slate-200 px-1.5 py-0.5">{fallbackLabel}</code> to <code className="rounded bg-slate-200 px-1.5 py-0.5">public/images/</code> for video
        </p>
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      muted
      onError={() => setError(true)}
      className="w-full aspect-video object-cover rounded-xl border-2 border-[var(--line)] shadow-lg"
    />
  );
}
