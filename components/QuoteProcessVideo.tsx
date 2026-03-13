'use client';

import { useEffect, useRef, useState } from 'react';

interface Step {
  title: string;
  desc: string;
}

interface QuoteProcessVideoProps {
  src: string;
  steps: Step[];
  className?: string;
}

export function QuoteProcessVideo({ src, steps, className = '' }: QuoteProcessVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    const tryPlay = () => video.play().catch(() => {});
    tryPlay();
    const onCanPlay = () => tryPlay();
    video.addEventListener('canplay', onCanPlay, { once: true });
    return () => video.removeEventListener('canplay', onCanPlay);
  }, [isVisible, mounted]);

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col gap-1">
            <h3 className="font-heading text-lg font-bold text-white">{s.title}</h3>
            <p className="text-slate-400">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-xl" style={{ aspectRatio: '16/9' }}>
        {mounted ? (
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          loop
          disablePictureInPicture
          disableRemotePlayback
          preload="auto"
          className="absolute inset-0 h-full w-full object-contain [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden"
          style={{ transform: 'translateZ(0)' }}
        />
        ) : (
          <div className="absolute inset-0 bg-slate-900" />
        )}
      </div>
    </div>
  );
}
