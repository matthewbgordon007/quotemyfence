'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type OnboardingState = {
  linkedSuppliers: number;
  savedLayouts: number;
  materialRequests: number;
  quotedRequests: number;
};

type Step = {
  n: number;
  title: string;
  detail: string;
  done: boolean;
  href: string;
  cta: string;
};

function loadOnboardingState(): Promise<OnboardingState> {
  return Promise.all([
    fetch('/api/contractor/suppliers', { credentials: 'include', cache: 'no-store' }).then((r) =>
      r.ok ? r.json() : { linkedSuppliers: [] }
    ),
    fetch('/api/contractor/layouts', { credentials: 'include', cache: 'no-store' }).then((r) =>
      r.ok ? r.json() : { layouts: [] }
    ),
    fetch('/api/contractor/material-quote-requests', { credentials: 'include', cache: 'no-store' }).then((r) =>
      r.ok ? r.json() : { requests: [] }
    ),
  ]).then(([suppliers, layouts, requests]) => {
    const reqs = (requests.requests || []) as { status?: string }[];
    return {
      linkedSuppliers: (suppliers.linkedSuppliers || []).length,
      savedLayouts: (layouts.layouts || []).length,
      materialRequests: reqs.length,
      quotedRequests: reqs.filter((r) => r.status === 'quoted').length,
    };
  });
}

function buildSteps(s: OnboardingState): Step[] {
  const hasSupplier = s.linkedSuppliers > 0;
  const hasLayout = s.savedLayouts > 0 || s.materialRequests > 0;
  const hasResponse = s.quotedRequests > 0;

  return [
    {
      n: 1,
      title: 'Link your supplier',
      detail: 'Search for your material supplier and connect your account (takes about a minute).',
      done: hasSupplier,
      href: '/dashboard/suppliers',
      cta: hasSupplier ? 'Manage suppliers' : 'Link supplier →',
    },
    {
      n: 2,
      title: 'Draw the fence layout',
      detail: 'Sketch the job, then type each line length in the boxes — lengths are not guessed from the drawing.',
      done: hasLayout,
      href: '/dashboard/layout',
      cta: hasLayout ? 'Open drawing' : 'Start drawing →',
    },
    {
      n: 3,
      title: 'Send for a material list',
      detail: 'Tap Get material list, enter job address/PO #, pick product colour, and send. Check Requests when your supplier replies.',
      done: hasResponse,
      href: '/dashboard/material-requests',
      cta: hasResponse ? 'View responses' : 'Track requests →',
    },
  ];
}

function nextStep(steps: Step[]): Step | null {
  return steps.find((s) => !s.done) ?? null;
}

export function FreeContractorOnboarding({
  variant = 'card',
  className = '',
}: {
  variant?: 'card' | 'compact' | 'sidebar';
  className?: string;
}) {
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOnboardingState().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = state ? buildSteps(state) : null;
  const active = steps ? nextStep(steps) : null;
  const allDone = steps?.every((s) => s.done);

  if (variant === 'sidebar') {
    return (
      <div className={`rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-3 text-xs text-slate-700 ${className}`}>
        <p className="font-semibold text-slate-900">Free tools</p>
        <p className="mt-1 leading-relaxed">Draw layouts and get material lists from your supplier — no subscription needed.</p>
        {active ? (
          <Link
            href={active.href}
            className="mt-2 inline-flex font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2"
          >
            Step {active.n}: {active.title} →
          </Link>
        ) : allDone ? (
          <Link href="/dashboard/billing" className="mt-2 inline-flex font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2">
            Unlock quotes & leads →
          </Link>
        ) : (
          <span className="mt-2 inline-block text-slate-500">Loading…</span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    if (!active) return null;
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 ${className}`}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Step {active.n} of 3</p>
          <p className="text-sm font-semibold text-slate-900">{active.title}</p>
          <p className="text-xs text-slate-600">{active.detail}</p>
        </div>
        <Link
          href={active.href}
          className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
        >
          {active.cta}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Get started free</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">Material lists in three steps</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            No credit card required. Link your supplier, draw the job, and they send back the material list.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Unlock full app →
        </Link>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {(steps ?? [
          { n: 1, title: 'Link your supplier', detail: '', done: false, href: '/dashboard/suppliers', cta: '' },
          { n: 2, title: 'Draw the fence layout', detail: '', done: false, href: '/dashboard/layout', cta: '' },
          { n: 3, title: 'Send for a material list', detail: '', done: false, href: '/dashboard/material-requests', cta: '' },
        ]).map((step) => {
          const isActive = active?.n === step.n;
          return (
            <li
              key={step.n}
              className={`rounded-xl border p-4 ${
                step.done
                  ? 'border-emerald-200 bg-white/80'
                  : isActive
                    ? 'border-emerald-400 bg-white ring-2 ring-emerald-400/30'
                    : 'border-slate-200/80 bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done ? 'bg-emerald-600 text-white' : isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.done ? '✓' : step.n}
                </span>
                <span className="text-sm font-semibold text-slate-900">{step.title}</span>
              </div>
              {step.detail ? <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.detail}</p> : null}
              {!step.done && step.cta ? (
                <Link href={step.href} className="mt-3 inline-flex text-xs font-semibold text-emerald-800 hover:text-emerald-900">
                  {step.cta}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>

      {allDone ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
          You&apos;re set up on the free plan. When you&apos;re ready for customer quotes, leads, and the full calculator,{' '}
          <Link href="/dashboard/billing" className="font-semibold text-emerald-800 underline">
            start your free trial
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
