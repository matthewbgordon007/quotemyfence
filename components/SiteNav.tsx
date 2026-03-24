'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';

const navLinks = [
  { href: '/blog', label: 'Blog' },
  { href: '/press', label: 'Press' },
  { href: '/partners', label: 'Partners' },
  { href: '/#faq', label: 'FAQ' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={`safe-area-t fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-xl transition-all duration-300 sm:px-8 sm:py-4 ${
          scrolled
            ? 'border-slate-200 bg-white/95 shadow-lg shadow-slate-200/50'
            : 'border-slate-200/80 bg-white/90'
        }`}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center transition-opacity hover:opacity-90"
          aria-label="QuoteMyFence home"
        >
          <img
            src="/quotemyfence-logo.png"
            alt="QuoteMyFence"
            className={`transition-all duration-300 ${scrolled ? 'h-9 sm:h-10' : 'h-10 sm:h-12'}`}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:inline-flex"
          >
            Member login
          </Link>
          <a
            href={SCHEDULE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 sm:inline-flex"
          >
            Book a call
          </a>
          <Link
            href="/signup"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
          >
            $199.99/mo
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed top-[57px] right-0 z-40 w-full max-w-sm rounded-bl-2xl border border-t-0 border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-1 p-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-2 border-t border-slate-200" />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Member login
          </Link>
          <a
            href={SCHEDULE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Book a call
          </a>
          <Link
            href="/signup"
            onClick={() => setMobileOpen(false)}
            className="mt-2 rounded-xl bg-blue-600 px-4 py-3 text-center font-bold text-white hover:bg-blue-500"
          >
            Get started — $199.99/mo
          </Link>
        </div>
      </div>
    </>
  );
}
