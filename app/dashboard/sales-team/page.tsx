'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { OptimizedProductImage } from '@/components/OptimizedProductImage';
import { useRouter } from 'next/navigation';

const ADMIN_ROLES = ['owner', 'admin'];

const field =
  'mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';

const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-indigo-50/30 px-5 py-4 sm:px-6';

interface SalesTeamMember {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  display_order: number;
  is_visible: boolean;
  receives_leads?: boolean;
}

function receivesLeadsFromRow(row: Record<string, unknown>): boolean {
  const v = row.receives_leads;
  return v === true || v === 'true' || v === 1;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className ?? ''}`} />;
}

export default function SalesTeamPage() {
  const router = useRouter();
  const listFetchGen = useRef(0);
  const [members, setMembers] = useState<SalesTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  function refresh() {
    const gen = ++listFetchGen.current;
    fetch('/api/contractor/sales-team', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        if (gen !== listFetchGen.current) return;
        const raw = (data.members || []) as SalesTeamMember[];
        setMembers(
          raw.map((m) => ({
            ...m,
            receives_leads: receivesLeadsFromRow(m as unknown as Record<string, unknown>),
          }))
        );
      })
      .finally(() => {
        if (gen === listFetchGen.current) setLoading(false);
      });
  }

  useEffect(() => {
    fetch('/api/contractor/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!ADMIN_ROLES.includes(data?.user_role || '')) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setName('');
    setTitle('');
    setPhone('');
    setEmail('');
    setPhotoUrl('');
    setPhotoError('');
    setShowAdd(false);
    setEditingId(null);
  }

  function startEdit(m: SalesTeamMember) {
    setEditingId(m.id);
    setName(m.name);
    setTitle(m.title || '');
    setPhone(m.phone || '');
    setEmail(m.email || '');
    setPhotoUrl(m.photo_url || '');
  }

  async function handlePhotoUpload(file: File) {
    setPhotoError('');
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'team');
      const res = await fetch('/api/contractor/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPhotoUrl(data.url);
      } else {
        setPhotoError(data.error || 'Upload failed');
      }
    } catch {
      setPhotoError('Network error');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      const res = await fetch(`/api/contractor/sales-team/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          photo_url: photoUrl || null,
        }),
      });
      if (res.ok) {
        refresh();
        resetForm();
      }
    } else {
      const res = await fetch('/api/contractor/sales-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          photo_url: photoUrl || null,
        }),
      });
      if (res.ok) {
        refresh();
        resetForm();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this team member from the thank-you page?')) return;
    const res = await fetch(`/api/contractor/sales-team/${id}`, { method: 'DELETE' });
    if (res.ok) refresh();
  }

  async function handleSetLeadRecipient(id: string, checked: boolean) {
    listFetchGen.current += 1;
    const previous = members;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, receives_leads: checked } : checked ? { ...m, receives_leads: false } : m
      )
    );
    try {
      const res = await fetch(`/api/contractor/sales-team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ receives_leads: checked }),
      });
      if (!res.ok) {
        setMembers(previous);
        return;
      }
      const updated = (await res.json()) as SalesTeamMember;
      const rl = receivesLeadsFromRow(updated as unknown as Record<string, unknown>);
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === updated.id) return { ...m, ...updated, receives_leads: rl };
          if (checked && rl) return { ...m, receives_leads: false };
          return m;
        })
      );
    } catch {
      setMembers(previous);
    }
  }

  if (loading) {
    return (
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 pb-10">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-gradient-to-r from-slate-200/90 to-slate-100/70" />
        <div className="h-4 max-w-lg animate-pulse rounded-md bg-slate-200/50" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-8 pb-10">
      <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-indigo-500/[0.07] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-16 top-32 h-48 w-48 rounded-full bg-blue-500/[0.06] blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-8 border-b border-slate-200/70 pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex gap-5">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 sm:flex">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584M6 18.75v-.75M15 6.75a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Customer experience</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Sales team</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Add people with photos and contact info for your thank-you page. Choose who receives new quote
              notifications.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add team member
          </button>
        </div>
      </div>

      {(showAdd || editingId) && (
        <div className={cardShell}>
          <div className={cardHeader}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" aria-hidden />
              <h2 className="text-base font-semibold text-slate-900">
                {editingId ? 'Edit team member' : 'Add team member'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Photo, name, title, and how customers can reach them</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="shrink-0">
                <label className="block text-sm font-medium text-slate-700">Photo</label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-slate-50 shadow-inner">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                        ?
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                    {photoUploading ? 'Uploading…' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                  </label>
                </div>
                {photoError && <p className="mt-2 text-sm font-medium text-red-600">{photoError}</p>}
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className={field}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    className={field}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (555) 123-4567"
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jane@company.com"
                      className={field}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.98]"
              >
                {editingId ? 'Save changes' : 'Add member'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.length === 0 && !showAdd && (
          <div
            className={`${cardShell} col-span-full flex flex-col items-center justify-center px-8 py-16 text-center`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"
                />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">No team members yet</p>
            <p className="mt-2 max-w-sm text-sm text-slate-600">
              Add people so customers recognize who they&apos;re working with after they submit a quote.
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAdd(true);
              }}
              className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-500"
            >
              Add your first member →
            </button>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className={`${cardShell} flex flex-col`}>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 shadow-sm">
                  {m.photo_url ? (
                    <OptimizedProductImage src={m.photo_url} alt={m.name} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                      {m.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{m.name}</p>
                  {m.title && <p className="mt-0.5 truncate text-sm text-slate-600">{m.title}</p>}
                  {(m.phone || m.email) && (
                    <div className="mt-2 flex flex-col gap-1 text-sm">
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="truncate font-medium text-blue-600 hover:text-blue-500">
                          {m.phone}
                        </a>
                      )}
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="truncate font-medium text-blue-600 hover:text-blue-500"
                        >
                          {m.email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
              {m.email && (
                <label className="mr-auto flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={receivesLeadsFromRow(m as unknown as Record<string, unknown>)}
                    onChange={(e) => handleSetLeadRecipient(m.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Receives leads
                </label>
              )}
              <button
                type="button"
                onClick={() => startEdit(m)}
                className="rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="rounded-lg border border-red-200/90 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
