'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-700/30 transition-all duration-300 hover:border-blue-500/30"
        >
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between px-6 py-5 text-left font-heading text-lg font-bold text-white transition-colors hover:bg-slate-700/50"
          >
            <span>{item.question}</span>
            <span
              className={`ml-4 shrink-0 text-2xl font-light text-slate-500 transition-transform duration-200 ${
                openIndex === i ? 'rotate-45' : ''
              }`}
            >
              +
            </span>
          </button>
          {openIndex === i && (
            <div className="border-t border-slate-700/60 px-6 py-5">
              <p className="text-slate-400 leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
