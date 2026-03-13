'use client';

import Image from 'next/image';

/** Two overlapping screenshots with subtle 3D perspective for marketing sections. */
export function StackedScreenshots({
  primary,
  secondary,
  primaryAlt,
  secondaryAlt,
  mirror = false,
  className = '',
}: {
  primary: string;
  secondary: string;
  primaryAlt: string;
  secondaryAlt: string;
  mirror?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative flex min-h-[240px] items-center justify-center sm:min-h-[300px] lg:min-h-[380px] ${className}`}>
      {/* Back screenshot - slightly smaller, tilted */}
      <div
        className={`absolute top-1/2 z-0 hidden overflow-hidden rounded-xl border border-slate-200/60 bg-white p-1.5 shadow-2xl ring-1 ring-slate-200/30 lg:block lg:w-[70%] lg:max-w-[200px] ${mirror ? 'left-0' : 'right-0'}`}
        style={{
          transform: mirror
            ? 'translateY(-50%) translateX(-12px) rotate(4deg)'
            : 'translateY(-50%) translateX(12px) rotate(-4deg)',
        }}
      >
        <div className="relative aspect-video w-full">
          <Image
            src={secondary}
            alt={secondaryAlt}
            fill
            className="rounded-lg object-cover"
            sizes="200px"
            quality={95}
          />
        </div>
      </div>
      {/* Front screenshot - larger, slight tilt left */}
      <div
        className="relative z-10 w-[85%] max-w-[280px] overflow-hidden rounded-xl border border-slate-200/60 bg-white p-2 shadow-2xl ring-1 ring-slate-200/30 transition-shadow duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] lg:max-w-[300px]"
        style={{ transform: mirror ? 'rotate(-2deg)' : 'rotate(2deg)' }}
      >
        <div className="relative aspect-video w-full">
          <Image
            src={primary}
            alt={primaryAlt}
            fill
            className="rounded-lg object-cover"
            sizes="(max-width: 1024px) 280px, 300px"
            quality={95}
          />
        </div>
      </div>
    </div>
  );
}
