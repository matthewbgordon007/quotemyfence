'use client';

import { useEffect, useState } from 'react';

export interface NewLeadFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_source: string;
  formatted_address: string;
}

const emptyForm: NewLeadFormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  lead_source: '',
  formatted_address: '',
};

interface NewLeadModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function NewLeadModal({ open, onClose, onCreated }: NewLeadModalProps) {
  const [form, setForm] = useState<NewLeadFormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setError(null);
      setCreating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, creating, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/contractor/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          lead_source: form.lead_source.trim() || undefined,
          formatted_address: form.formatted_address.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');
      onCreated(data.id as string);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setCreating(false);
    }
  }

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-lead-title"
      onClick={() => !creating && onClose()}
    >
      <div
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
            <h2 id="new-lead-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              New lead
            </h2>
            <p className="mt-1 text-sm text-slate-600">Add someone who has not used your quote page yet.</p>
          </div>
          <button
            type="button"
            onClick={() => !creating && onClose()}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="nl-first">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                id="nl-first"
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                className={inputClass}
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="nl-last">
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                id="nl-last"
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                className={inputClass}
                required
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="nl-email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="nl-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={inputClass}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="nl-phone">
              Phone
            </label>
            <input
              id="nl-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className={inputClass}
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="nl-address">
              Address
            </label>
            <input
              id="nl-address"
              type="text"
              value={form.formatted_address}
              onChange={(e) => setForm((p) => ({ ...p, formatted_address: e.target.value }))}
              className={inputClass}
              placeholder="123 Main St, City, Province"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="nl-source">
              Lead source
            </label>
            <input
              id="nl-source"
              type="text"
              value={form.lead_source}
              onChange={(e) => setForm((p) => ({ ...p, lead_source: e.target.value }))}
              className={inputClass}
              placeholder="Referral, website, walk-in…"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create lead'}
            </button>
            <button
              type="button"
              onClick={() => !creating && onClose()}
              disabled={creating}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
