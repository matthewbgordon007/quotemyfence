'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';

/** Homepage section anchors — matches ids in app/page.tsx */
const SECTION_LINKS = [
  { id: 'demo', label: 'Demo video' },
  { id: 'features', label: 'Features' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
] as const;

function sectionHref(pathname: string | null, id: string) {
  if (pathname === '/') return `#${id}`;
  return `/#${id}`;
}

const navLinks = [
  { href: '/blog', label: 'Blog' },
  { href: '/press', label: 'Press' },
  { href: '/partners', label: 'Partners' },
  { href: '/supplier', label: 'Supplier' },
  { href: '/#faq', label: 'FAQ' },
];

const linkInPill =
  'relative rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white hover:text-blue-700 hover:shadow-sm';

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [mobileOpen]);

  useEffect(() => {
    if (!sectionsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sectionsRef.current && !sectionsRef.current.contains(e.target as Node)) setSectionsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSectionsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [sectionsOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <nav
        className={`safe-area-t fixed left-0 right-0 top-0 z-50 border-b px-4 py-3 transition-all duration-300 sm:px-6 sm:py-3.5 lg:px-8 ${
          scrolled
            ? 'border-slate-200/90 bg-white/85 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150'
            : 'border-slate-200/60 bg-white/70 backdrop-blur-xl backdrop-saturate-150'
        }`}
      >
        {/* Accent hairline */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/35 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:justify-between lg:gap-6">
          <Link
            href="/"
            className="group flex shrink-0 items-center rounded-xl p-1 ring-1 ring-transparent transition-all hover:bg-slate-50/80 hover:ring-slate-200/80 lg:justify-self-start"
            aria-label="QuoteMyFence home"
          >
            <img
              src="/quotemyfence-logo.png"
              alt="QuoteMyFence"
              className={`transition-all duration-300 group-hover:scale-[1.02] ${scrolled ? 'h-9 sm:h-10' : 'h-10 sm:h-11'}`}
            />
          </Link>

          {/* Desktop: centered nav rail */}
          <div className="hidden min-w-0 items-center justify-center lg:flex lg:justify-self-center">
            <div className="flex items-center gap-1 rounded-full border border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/90 p-1 pl-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-200/40">
              <div className="relative" ref={sectionsRef}>
                <button
                  type="button"
                  onClick={() => setSectionsOpen((o) => !o)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                    sectionsOpen
                      ? 'bg-white text-blue-700 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                      : 'bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10 text-blue-800 hover:from-blue-600/15 hover:via-indigo-600/15 hover:to-blue-600/15'
                  }`}
                  aria-expanded={sectionsOpen}
                  aria-haspopup="menu"
                >
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                  Jump to
                  <svg
                    className={`h-3.5 w-3.5 text-blue-600/80 transition-transform duration-200 ${sectionsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {sectionsOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 z-50 mt-2 max-h-[min(70vh,24rem)] w-[min(100vw-2rem,15.5rem)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 py-2 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.25)] ring-1 ring-slate-100 backdrop-blur-md"
                  >
                    <p className="px-4 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">On this page</p>
                    {SECTION_LINKS.map((s) => (
                      <a
                        key={s.id}
                        role="menuitem"
                        href={sectionHref(pathname, s.id)}
                        onClick={() => setSectionsOpen(false)}
                        className="mx-1 block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/80 hover:text-blue-800"
                      >
                        {s.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <span className="mx-0.5 hidden h-5 w-px bg-slate-200/90 sm:block" aria-hidden />

              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className={linkInPill}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5 lg:justify-self-end">
            <Link
              href="/login"
              className="hidden rounded-full border border-slate-200/90 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-800 sm:inline-flex"
            >
              Member login
            </Link>
            <Link
              href="/supplier"
              className="hidden rounded-full border border-blue-200/90 bg-blue-50/70 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100/80 sm:inline-flex"
            >
              Supplier portal
            </Link>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border-2 border-blue-600 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:shadow-md hover:shadow-blue-500/10 sm:inline-flex sm:items-center sm:justify-center"
            >
              Book a call
            </a>
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition-all hover:from-blue-500 hover:via-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98] sm:px-5"
            >
              $199.99/mo
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-800 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed right-0 top-[57px] z-40 w-full max-w-sm overflow-hidden rounded-bl-3xl border border-t-0 border-slate-200/90 bg-white shadow-[0_24px_64px_-16px_rgba(30,58,138,0.2)] transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">QuoteMyFence</p>
          <p className="mt-1 text-lg font-bold leading-tight">Where do you want to go?</p>
        </div>
        <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-3 pb-6 pt-2">
          <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">On this page</p>
          {SECTION_LINKS.map((s) => (
            <a
              key={s.id}
              href={sectionHref(pathname, s.id)}
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800"
            >
              {s.label}
            </a>
          ))}
          <div className="mx-3 my-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Site</p>
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="mx-3 my-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-[15px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
            Member login
          </Link>
          <Link
            href="/supplier"
            onClick={() => setMobileOpen(false)}
            className="mt-2 block rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center text-[15px] font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-100/70"
          >
            Supplier portal
          </Link>
          <a
            href={SCHEDULE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="mt-2 block rounded-xl border-2 border-blue-600 bg-white px-3 py-3 text-center text-[15px] font-bold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Book a call
          </a>
          <Link
            href="/signup"
            onClick={() => setMobileOpen(false)}
            className="mt-3 block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3.5 text-center text-[15px] font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-indigo-500"
          >
            Get started — $199.99/mo
          </Link>
        </div>
      </div>
    </>
  );
}
