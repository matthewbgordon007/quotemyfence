import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';

function FeatureCard({
  title,
  description,
  icon,
  accent,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  accent: 'blue' | 'indigo' | 'sky';
}) {
  const accents = {
    blue: 'from-blue-500/15 to-blue-600/5 ring-blue-200/80 group-hover:ring-blue-300/90',
    indigo: 'from-indigo-500/15 to-indigo-600/5 ring-indigo-200/80 group-hover:ring-indigo-300/90',
    sky: 'from-sky-500/15 to-sky-600/5 ring-sky-200/80 group-hover:ring-sky-300/90',
  } as const;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-white/70 p-5 shadow-lg shadow-blue-900/[0.06] ring-1 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-blue-600/15 ${accents[accent]}`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition group-hover:opacity-100 ${
          accent === 'blue'
            ? 'from-blue-400/40 to-transparent'
            : accent === 'indigo'
              ? 'from-indigo-400/40 to-transparent'
              : 'from-sky-400/40 to-transparent'
        }`}
        aria-hidden
      />
      <div className="relative flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function SupplierLandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-50 via-white to-sky-100/80 text-slate-900">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-blue-400/25 via-blue-300/10 to-transparent blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-[22rem] w-[22rem] rounded-full bg-gradient-to-bl from-indigo-400/20 via-sky-300/15 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[min(100%,48rem)] -translate-x-1/2 rounded-full bg-gradient-to-t from-blue-200/30 to-transparent blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(59 130 246 / 0.12) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <SiteNav />

      <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
        {/* Top accent bar */}
        <div className="mb-8 flex justify-center">
          <div className="h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.45)]" />
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-2xl shadow-blue-900/10 ring-1 ring-blue-100/80 backdrop-blur-xl sm:p-12 lg:p-14">
          {/* Card inner glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-500/[0.06] via-transparent to-indigo-500/[0.07]"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" aria-hidden />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-blue-800 shadow-sm shadow-blue-500/10">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                Supplier portal
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Power your supply side with a{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                workspace built for suppliers
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Everything contractors get—plus supplier-only tools for quotes, relationships, and materials. Sign in or
              start fresh in seconds.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <FeatureCard
                accent="blue"
                title="Contractor Quotes"
                description="Track and respond to contractor quote requests in one focused view."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <FeatureCard
                accent="indigo"
                title="Contractor Management"
                description="Keep contractor relationships, status, and details organized as you scale."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <FeatureCard
                accent="sky"
                title="Material Calculator"
                description="Turn incoming jobs into material estimates without leaving your flow."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/supplier/login"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border-2 border-blue-200/90 bg-white px-6 py-3.5 text-sm font-bold text-blue-800 shadow-md shadow-blue-900/5 transition hover:border-blue-300 hover:bg-blue-50/80 hover:shadow-lg sm:flex-initial sm:min-w-[200px]"
              >
                Supplier login
              </Link>
              <Link
                href="/supplier/signup"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/35 transition hover:from-blue-500 hover:via-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.98] sm:flex-initial sm:min-w-[220px]"
              >
                Create supplier account
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100/90 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/80 px-5 py-4 shadow-inner shadow-blue-500/5">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Fence contractor?</span> Use the standard dashboard login.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-blue-200/80 transition hover:bg-blue-50 hover:ring-blue-300"
              >
                Contractor login
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-blue-700 hover:text-blue-600 hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
