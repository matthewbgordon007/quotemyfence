'use client';

import { useEffect, useState } from 'react';

/**
 * Scroll-driven backdrop: a sharp diagonal split between light and blue.
 * At the top of the page the split is roughly half-and-half; as you scroll,
 * the boundary moves so the viewport reads increasingly blue (still diagonal).
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

  // Position of the diagonal boundary along the gradient axis (0–50% ≈ half plane for this angle).
  const split = Math.max(0, 50 * (1 - progress));
  const angle = 128;
  const feather = 0.85;

  const gradient =
    split <= feather
      ? `linear-gradient(${angle}deg, rgb(37 99 235) 0%, rgb(29 78 216) 42%, rgb(15 23 42) 100%)`
      : `linear-gradient(${angle}deg,
          rgb(248 250 252) 0%,
          rgb(248 250 252) calc(${split - feather}%),
          rgb(59 130 246) ${split}%,
          rgb(15 23 42) 100%)`;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: gradient }} />
      {/* Very light texture so flat colour fields still feel finished */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.2) 1px, transparent 0)`,
          backgroundSize: '44px 44px',
        }}
      />
    </div>
  );
}
