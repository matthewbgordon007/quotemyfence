'use client';

import Image from 'next/image';

export function FloatingScreenshot({
  src,
  alt,
  className = '',
  delay = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`relative aspect-video animate-float overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-200/50 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Image src={src} alt={alt} fill className="rounded-lg object-cover" sizes="280px" quality={95} />
    </div>
  );
}
