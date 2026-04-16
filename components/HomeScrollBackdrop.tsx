'use client';

import { useEffect, useRef, useState } from 'react';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Softer end to the scroll journey so the blue “fills in” without feeling abrupt. */
function easeOutCubic(t: number) {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

/**
 * Scroll-driven backdrop: diagonal light / blue split that deepens as you scroll.
 * Layered for depth (base split + vignette + soft sheen + fine texture).
 */
export function HomeScrollBackdrop() {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const read = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const el = document.documentElement;
        const max = el.scrollHeight - el.clientHeight;
        const raw = max <= 0 ? 0 : clamp01(el.scrollTop / max);
        const t = reduceMotion ? raw : easeOutCubic(raw);
        setProgress(t);
      });
    };

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => read();
    mq.addEventListener('change', onMq);

    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Diagonal: slightly shallower angle reads more “designed” on wide screens
  const angle = 122;
  const feather = 1.15;
  const split = Math.max(0, 54 * (1 - progress));

  const lightTop = 'rgb(252 253 255)';
  const lightMid = 'rgb(241 245 249)';

  const mainGradient =
    split <= feather
      ? `linear-gradient(${angle}deg,
          rgb(30 64 175) 0%,
          rgb(37 99 235) 32%,
          rgb(67 56 202) 58%,
          rgb(30 27 75) 82%,
          rgb(15 23 42) 100%)`
      : `linear-gradient(${angle}deg,
          ${lightTop} 0%,
          ${lightMid} calc(${split - feather * 1.2}%),
          rgb(219 234 254) calc(${split - feather * 0.35}%),
          rgb(96 165 250) calc(${split - 0.15}%),
          rgb(59 130 246) ${split}%,
          rgb(37 99 235) calc(${split + 18}%),
          rgb(49 46 129) 78%,
          rgb(15 23 42) 100%)`;

  const vignetteOpacity = 0.35 + progress * 0.35;
  const sheenOpacity = 0.12 + (1 - progress) * 0.18;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: mainGradient }} />

      {/* Depth: corner vignette (keeps center readable; strengthens as you scroll) */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: vignetteOpacity,
          background: `
            radial-gradient(ellipse 120% 80% at 50% -10%, rgba(255,255,255,0.55) 0%, transparent 45%),
            radial-gradient(ellipse 90% 70% at 100% 100%, rgba(15,23,42,0.45) 0%, transparent 55%),
            radial-gradient(ellipse 80% 60% at 0% 100%, rgba(30,58,138,0.35) 0%, transparent 50%)
          `,
        }}
      />

      {/* Soft crossing sheen — adds polish without reading as “another gradient fight” */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          opacity: sheenOpacity,
          background: `linear-gradient(${angle + 48}deg,
            transparent 0%,
            rgba(255,255,255,0.22) 42%,
            transparent 78%)`,
        }}
      />

      {/* Fine texture (lighter than before; reads as paper / air) */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.35) 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />
    </div>
  );
}
