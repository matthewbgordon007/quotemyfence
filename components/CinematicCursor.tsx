'use client';

import { useEffect, useState } from 'react';

export function CinematicCursor() {
  const [pos, setPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-30 hidden h-64 w-64 rounded-full bg-blue-400/10 blur-3xl lg:block"
      style={{
        left: pos.x - 128,
        top: pos.y - 128,
        transition: 'left 120ms linear, top 120ms linear',
      }}
      aria-hidden="true"
    />
  );
}

