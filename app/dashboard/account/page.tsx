'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const field =
  'mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';

const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/35 px-5 py-4 sm:px-6';

type MaterialListSaveRow = { id: string; title: string; quote_session_id: string | null; created_at: string };

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [materialLists, setMaterialLists] = useState<MaterialListSaveRow[]>([]);
  const [materialListsLoading, setMaterialListsLoading] = useState(true);
  const [deletingMaterialListId, setDeletingMaterialListId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/contractor/material-list-saves', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { saves?: MaterialListSaveRow[] } | null) => {
        if (cancelled || !data?.saves) return;
        setMaterialLists(data.saves);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMaterialListsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function deleteMaterialList(id: string) {
    if (!confirm('Remove this saved map sketch from your profile?')) return;
    setDeletingMaterialListId(id);
    try {
      const res = await fetch(`/api/contractor/material-list-saves/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) setMaterialLists((prev) => prev.filter((r) => r.id !== id));
      else {
        const d = await res.json().catch(() => ({}));
        alert((d as { error?: string }).error || 'Could not delete');
      }
    } catch {
      alert('Could not delete');
    } finally {
      setDeletingMaterialListId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contractor/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('Password updated. You can keep using the app.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Could not update password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl space-y-8 pb-10">
      <div>
        <p className="text-sm font-medium text-slate-500">Your account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Password &amp; security</h1>
        <p className="mt-2 text-sm text-slate-600">
          Change the password you use to sign in. Company email and branding are still managed under Settings (admins
          only).
        </p>
      </div>

      <div className={cardShell}>
        <div className={cardHeader}>
          <h2 className="text-base font-semibold text-slate-900">Change password</h2>
          <p className="mt-1 text-xs text-slate-500">Use a strong password you do not reuse elsewhere.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          {message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>
          )}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={field}
            />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={field}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      <div className={cardShell}>
        <div className={cardHeader}>
          <h2 className="text-base font-semibold text-slate-900">Material lists</h2>
          <p className="mt-1 text-xs text-slate-500">
            Map sketches you saved from the quote calculator (job address as the title). Open one in the FMS material
            calculator anytime.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          {materialListsLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : materialLists.length === 0 ? (
            <p className="text-sm text-slate-600">
              Nothing saved yet. On the quote page, under the customer map, choose{' '}
              <span className="font-medium text-slate-800">Save map to my profile first</span> before opening the
              material calculator.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {materialLists.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900" title={row.title}>
                      {row.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(row.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/dashboard/material-calculator?from_material_sketch_save=${encodeURIComponent(row.id)}`}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Open in calculator
                    </Link>
                    <button
                      type="button"
                      disabled={deletingMaterialListId === row.id}
                      onClick={() => void deleteMaterialList(row.id)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingMaterialListId === row.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        Back to overview
      </Link>
    </div>
  );
}
