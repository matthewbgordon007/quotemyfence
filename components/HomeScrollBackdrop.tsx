'use client';

import { useEffect, useState } from 'react';

/**
 * Scroll-driven background: starts ~half light / half blue at the top; as the user scrolls,
 * the blue “rises” until the viewport read is mostly deep blue at the bottom of the page.
 */
export function HomeScrollBackdrop() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const read = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max));
      setProgress(p);
    };

    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  // 0 → split around mid viewport; 1 → white band shrinks to 0 (full blue read)
  const whiteStop = 58 * (1 - progress);
  const blendLow = Math.min(92, whiteStop + 14 + progress * 6);
  const midBlue = `rgb(37 99 235 / ${0.55 + progress * 0.35})`;
  const deepBlue = `rgb(23 37 84 / ${0.92 + progress * 0.08})`;

  const gradient = `linear-gradient(180deg,
    rgb(248 250 252) 0%,
    rgb(248 250 252) ${whiteStop}%,
    ${midBlue} ${blendLow}%,
    ${deepBlue} 100%)`;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div
        className="absolute -right-1/4 top-0 h-[min(80vh,36rem)] w-[min(80vw,42rem)] rounded-full bg-blue-400/25 blur-3xl"
        style={{ opacity: 0.35 + progress * 0.45 }}
      />
      <div
        className="absolute -left-1/4 bottom-0 h-[min(70vh,28rem)] w-[min(90vw,40rem)] rounded-full bg-indigo-500/20 blur-3xl"
        style={{ opacity: 0.25 + progress * 0.5 }}
      />
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.14) 1px, transparent 0)`,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
