'use client';

import { useEffect, useState } from 'react';
import { TiltCard } from '@/components/TiltCard';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
};

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((v) => (v + 1) % items.length), 4500);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <div className="mt-8 sm:mt-12">
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t, i) => {
          const active = i === index;
          return (
            <TiltCard key={t.name} className={`${active ? 'scale-[1.02]' : 'scale-100 opacity-80'} transition-all`}>
              <div className={`rounded-2xl border p-5 sm:p-6 ${active ? 'border-blue-300 bg-white shadow-xl' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-lg font-medium text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">{t.avatar}</div>
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2.5 w-2.5 rounded-full ${i === index ? 'bg-blue-600' : 'bg-slate-300'}`}
            aria-label={`Go to testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

