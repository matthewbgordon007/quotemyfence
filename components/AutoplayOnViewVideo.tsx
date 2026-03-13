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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {mounted ? (
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          loop
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
