'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const SCREENSHOTS = Array.from({ length: 19 }, (_, i) =>
  `/images/screenshots/app-${String(i + 1).padStart(2, '0')}.png`
);

export function AppScreenshotCarousel({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SCREENSHOTS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl ring-1 ring-slate-200/30">
        {SCREENSHOTS.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <Image src={src} alt={`QuoteMyFence screenshot ${i + 1}`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 1024px" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {SCREENSHOTS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
          />
        ))}
      </div>
    </div>
  );
}
