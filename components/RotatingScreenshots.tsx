'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const SCREENSHOTS = Array.from({ length: 19 }, (_, i) =>
  `/images/screenshots/app-${String(i + 1).padStart(2, '0')}.png`
);

export function RotatingScreenshots({ count = 6, className = '' }: { count?: number; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SCREENSHOTS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const show = Array.from({ length: count }, (_, i) => SCREENSHOTS[(index + i) % SCREENSHOTS.length]);

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {show.map((src, i) => (
        <div
          key={`${src}-${index}-${i}`}
          className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-lg ring-1 ring-slate-200/30 transition-all duration-500 hover:scale-105"
          style={{ transform: `rotate(${-4 + i * 1.5}deg)` }}
        >
          <Image src={src} alt="App screenshot" width={140} height={90} className="object-cover" />
        </div>
      ))}
    </div>
  );
}
