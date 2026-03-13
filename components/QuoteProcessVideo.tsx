'use client';

import { useEffect, useRef, useState } from 'react';

interface Segment {
  startTime: number;
  title: string;
  desc: string;
}

interface QuoteProcessVideoProps {
  src: string;
  segments: Segment[];
  className?: string;
}

export function QuoteProcessVideo({ src, segments, className = '' }: QuoteProcessVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastIndexRef = useRef(0);

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
      { threshold: 0.25 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    video.play().catch(() => {});
  }, [isVisible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      let newIndex = 0;
      for (let i = segments.length - 1; i >= 0; i--) {
        if (time >= segments[i].startTime) {
          newIndex = i;
          break;
        }
      }
      if (newIndex !== lastIndexRef.current) {
        lastIndexRef.current = newIndex;
        setActiveIndex(newIndex);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [segments]);

  const segment = segments[activeIndex];

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      <div className="mb-4 h-16 shrink-0 px-1">
        {mounted ? (
          <>
            <h3 className="font-heading text-xl font-bold text-slate-900">{segment.title}</h3>
            <p className="mt-1 text-slate-600">{segment.desc}</p>
          </>
        ) : (
          <>
            <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
          </>
        )}
      </div>
      <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900 shadow-xl ring-1 ring-slate-200/30" style={{ aspectRatio: '16/9' }}>
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
