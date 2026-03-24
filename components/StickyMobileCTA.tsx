'use client';

import Link from 'next/link';

export function StickyMobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-2">
        <a
          href="https://www.quotemyfence.ca/estimate/demo-fence-inc/contact"
          className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white"
        >
          Try demo
        </a>
        <Link
          href="/signup"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-800"
        >
          Start now
        </Link>
      </div>
    </div>
  );
}

