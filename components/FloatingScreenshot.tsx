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
      className={`relative aspect-video animate-float overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50 p-2 shadow-xl ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Image src={src} alt={alt} fill className="rounded-lg object-cover" sizes="280px" quality={95} />
    </div>
  );
}
