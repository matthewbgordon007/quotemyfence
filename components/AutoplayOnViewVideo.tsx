'use client';

import { useEffect, useRef, useState } from 'react';

interface AutoplayOnViewVideoProps {
  src: string;
  className?: string;
}

export function AutoplayOnViewVideo({ src, className = '' }: AutoplayOnViewVideoProps) {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const tryPlay = () => {
      video.play().catch(() => {});
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) tryPlay();
          else video.pause();
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(container);
    // If already in view, play (observer callback can be async)
    const rect = container.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) tryPlay();

    return () => observer.disconnect();
  }, [mounted]);

  return (
    <div ref={containerRef} className={className}>
      {mounted ? (
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          loop
          preload="auto"
          onCanPlay={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
              e.currentTarget.play().catch(() => {});
            }
          }}
          disablePictureInPicture
          disableRemotePlayback
          className="w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900 shadow-xl ring-1 ring-slate-200/30 [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden"
        />
      ) : (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900 shadow-xl ring-1 ring-slate-200/30" />
      )}
    </div>
  );
}
