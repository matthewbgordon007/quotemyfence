'use client';

import { useEffect, useState } from 'react';
import { useEstimate } from '@/app/estimate/[slug]/EstimateContext';

export function EstimateHelpButton() {
  const { state } = useEstimate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Prefill from whatever the visitor has already entered in the quote flow.
  useEffect(() => {
    if (!open) return;
    const fullName = [state.contact.firstName, state.contact.lastName].filter(Boolean).join(' ');
    if (fullName) setName((prev) => prev || fullName);
    if (state.contact.email) setEmail((prev) => prev || state.contact.email);
    if (state.contact.phone) setPhone((prev) => prev || state.contact.phone);
  }, [open, state.contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError('Please describe what went wrong.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email so we can reach you.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/help-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
          quoteSessionId: state.sessionId,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send your message. Please try again.');
        return;
      }
      setSent(true);
      setMessage('');
    } catch {
      setError('Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    // Reset the success state a moment later so reopening shows a fresh form.
    setTimeout(() => setSent(false), 300);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 sm:bottom-6 sm:left-6">
      {open && (
        <div className="w-[20rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-400/30">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="font-semibold text-slate-900">Message sent</div>
              <p className="mt-1 text-sm text-slate-500">
                Thanks! We&apos;ll look into it and get back to you by email.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">Need help?</div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Hit a problem getting your quote? Tell us what happened and we&apos;ll help.
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What went wrong?"
                rows={3}
                required
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              {error && <div className="text-xs font-medium text-red-600">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-xl shadow-slate-900/10 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help
        </button>
      )}
    </div>
  );
}
