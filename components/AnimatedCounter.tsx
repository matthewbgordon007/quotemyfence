'use client';

import { useEffect, useRef, useState } from 'react';

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 2000,
  startOnView = true,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  startOnView?: boolean;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(!startOnView);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated && startOnView) return;
    if (!startOnView) {
      setHasAnimated(true);
    }

    const el = ref.current;
    if (!el && startOnView) return;

    const run = () => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutQuart(progress);
        setCount(Math.round(value * eased));
        if (progress < 1) requestAnimationFrame(animate);
        else setHasAnimated(true);
      };
      requestAnimationFrame(animate);
    };

    if (startOnView && el) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !hasAnimated) run();
        },
        { threshold: 0.2 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
    run();
  }, [value, duration, startOnView, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}
