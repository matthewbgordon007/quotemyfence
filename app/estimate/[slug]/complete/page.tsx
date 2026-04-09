'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ESTIMATE_NEW_QUOTE_QUERY } from '@/lib/estimate-session-url';
import { OptimizedProductImage } from '@/components/OptimizedProductImage';
import { useEstimate } from '../EstimateContext';

export default function CompletePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { config, state } = useEstimate();
  const { contractor, salesTeam } = config;
  const totals = state.totals;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm text-center">
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
        <div className="p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-800">Thank you</h1>
        <p className="mt-2 text-slate-500">
          Your quote request has been sent to {contractor.company_name}. They will follow up with you
          shortly.
        </p>

        {totals && (
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-slate-50/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your estimated range</div>
            <div className="mt-1 text-xl font-bold">
              ${totals.total_low.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${totals.total_high.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
            </div>
            <div className="text-sm text-slate-500">Including estimated tax</div>
          </div>
        )}

        {(contractor.phone || contractor.email) && (
          <div className="mt-6 text-sm text-slate-500">
            Questions? Contact {contractor.company_name} at{' '}
            {contractor.phone && <a href={`tel:${contractor.phone}`} className="font-semibold text-[var(--accent)]">{contractor.phone}</a>}
            {contractor.phone && contractor.email && ' or '}
            {contractor.email && (
              <a href={`mailto:${contractor.email}`} className="font-semibold text-[var(--accent)]">
                {contractor.email}
              </a>
            )}
          </div>
        )}
        </div>
      </div>

      {salesTeam && salesTeam.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
          <div className="p-8">
          <h2 className="text-lg font-bold text-slate-800">Your team</h2>
          <p className="mt-2 text-sm text-slate-500">
            One of these sales team members will be reaching out shortly.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {salesTeam.map((member) => (
              <div
                key={member.id}
                className="flex items-start gap-4 rounded-xl border border-[var(--line)] bg-slate-50/80 p-5"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white shadow">
                  {member.photo_url ? (
                    <OptimizedProductImage src={member.photo_url} alt={member.name} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--accent)]/20 text-xl font-bold text-[var(--accent)]">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{member.name}</div>
                  {member.title && (
                    <div className="text-sm text-slate-500">{member.title}</div>
                  )}
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="mt-1 block break-all text-sm text-[var(--accent)] hover:underline">
                      {member.phone}
                    </a>
                  )}
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="mt-0.5 block break-all text-sm text-[var(--accent)] hover:underline">
                      {member.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-center">
        <Link
          href={slug ? `/estimate/${slug}/contact?${ESTIMATE_NEW_QUOTE_QUERY}=1` : '/'}
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          Submit another quote
        </Link>
      </p>
    </div>
  );
}
