'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Step {
  title: string;
  desc: string;
  src: string;
}

interface SequentialVideosProps {
  steps: Step[];
  className?: string;
}

export function SequentialVideos({ steps, className = '' }: SequentialVideosProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const playNext = useCallback(() => {
    const next = (activeIndex + 1) % steps.length;
    setActiveIndex(next);
    const video = videoRefs.current[next];
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }, [activeIndex, steps.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const video = videoRefs.current[activeIndex];
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }, [isVisible, activeIndex]);

  const handleEnded = () => {
    const next = (activeIndex + 1) % steps.length;
    setActiveIndex(next);
    const video = videoRefs.current[next];
    if (video) {
      video.currentTime = 0;
      setTimeout(() => video.play().catch(() => {}), 50);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900 shadow-xl ring-1 ring-slate-200/30">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`absolute inset-0 flex flex-col transition-opacity duration-600 ease-in-out ${
              i === activeIndex ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="shrink-0 bg-slate-900/95 px-6 py-4">
              <h3 className="font-heading text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-1 text-slate-300">{step.desc}</p>
            </div>
            <div className="relative min-h-0 flex-1">
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={step.src}
                playsInline
                muted
                onEnded={handleEnded}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
