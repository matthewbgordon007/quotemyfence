'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  estimateStepPath,
  ESTIMATE_SESSION_QUERY,
  ESTIMATE_NEW_QUOTE_QUERY,
} from '@/lib/estimate-session-url';
import { useEstimate } from '../EstimateContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const defaultContactValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  leadSource: '',
};

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').regex(/[\d\s\-\(\)]+/, 'Invalid phone'),
  leadSource: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { config, state, setContact, setSessionId, resetState } = useEstimate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const contactPrefillKeyRef = useRef<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: state.contact.firstName || '',
      lastName: state.contact.lastName || '',
      email: state.contact.email || '',
      phone: state.contact.phone || '',
      leadSource: state.contact.leadSource || '',
    },
  });

  useEffect(() => {
    if (searchParams.get(ESTIMATE_NEW_QUOTE_QUERY) !== '1') return;
    resetState();
    reset(defaultContactValues);
    contactPrefillKeyRef.current = '';
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(ESTIMATE_SESSION_QUERY);
    sp.delete(ESTIMATE_NEW_QUOTE_QUERY);
    const rest = sp.toString();
    router.replace(`/estimate/${encodeURIComponent(slug)}/contact${rest ? `?${rest}` : ''}`);
  }, [searchParams, resetState, reset, router, slug]);

  useEffect(() => {
    if (searchParams.get(ESTIMATE_NEW_QUOTE_QUERY) === '1') return;
    const sid = searchParams.get(ESTIMATE_SESSION_QUERY);
    if (!state.contact.email || !sid) return;
    const key = `${sid}:${state.contact.email}`;
    if (contactPrefillKeyRef.current === key) return;
    contactPrefillKeyRef.current = key;
    reset({
      firstName: state.contact.firstName,
      lastName: state.contact.lastName,
      email: state.contact.email,
      phone: state.contact.phone || '',
      leadSource: state.contact.leadSource || '',
    });
  }, [
    searchParams,
    state.contact.email,
    state.contact.firstName,
    state.contact.lastName,
    state.contact.phone,
    state.contact.leadSource,
    reset,
  ]);

  async function onSubmit(data: ContactFormData) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/public/quote-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorSlug: slug,
          contact: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            leadSource: data.leadSource || null,
          },
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to start session');
      }
      const json = await res.json();
      setSessionId(json.sessionId);
      setContact({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        leadSource: data.leadSource || '',
      });
      router.push(estimateStepPath(slug, 'location', json.sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const { leadSources } = config;

  const inputClass =
    'mt-2 w-full rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3 text-[var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20';
  const labelClass = 'block text-sm font-semibold text-slate-600';

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, var(--accent), var(--accent-secondary))` }}
        />
        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Contact information</h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;ll use this to send your estimate and follow up.
          </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First name
              </label>
              <input
                id="firstName"
                {...register('firstName')}
                className={inputClass}
                placeholder="Jane"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last name
              </label>
              <input
                id="lastName"
                {...register('lastName')}
                className={inputClass}
                placeholder="Smith"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={inputClass}
              placeholder="jane@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className={inputClass}
              placeholder="(613) 555-5555"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="leadSource" className={labelClass}>
              How did you hear about us? <span className="font-normal text-slate-400">(optional)</span>
            </label>
            {leadSources && leadSources.length > 0 ? (
              <select
                id="leadSource"
                {...register('leadSource')}
                className={inputClass}
              >
                <option value="">Select...</option>
                {leadSources.map((s) => (
                  <option key={s.id} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="leadSource"
                type="text"
                {...register('leadSource')}
                placeholder="e.g. Google, referral, social media"
                className={inputClass}
              />
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[var(--accent)]/30 disabled:translate-y-0 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
