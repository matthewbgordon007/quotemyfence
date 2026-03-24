'use client';

import Link from 'next/link';

export function DesktopCTARail() {
  return (
    <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <div className="w-52 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready to start?</p>
        <div className="mt-3 flex flex-col gap-2">
          <a href="https://www.quotemyfence.ca/estimate/demo-fence-inc/contact" className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-500">Try demo</a>
          <Link href="/signup" className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-bold text-slate-800 hover:bg-slate-50">Get started</Link>
          <a href="https://calendar.app.google/vuWD6xi7CfNptAon9" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-bold text-slate-800 hover:bg-slate-50">Book call</a>
        </div>
      </div>
    </div>
  );
}

