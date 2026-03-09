'use client';

import { useState, useEffect } from 'react';

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

export default function SalesTeamPage() {
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
    fetch('/api/contractor/sales-team')
      .then((r) => r.json())
      .then((data) => setMembers(data.members || []))
      .finally(() => setLoading(false));
  }

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
        body: JSON.stringify({ name: name.trim(), title: title.trim() || null, phone: phone.trim() || null, email: email.trim() || null, photo_url: photoUrl || null }),
      });
      if (res.ok) {
        refresh();
        resetForm();
      }
    } else {
      const res = await fetch('/api/contractor/sales-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), title: title.trim() || null, phone: phone.trim() || null, email: email.trim() || null, photo_url: photoUrl || null }),
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
    // Optimistic update so checkbox responds immediately
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, receives_leads: checked } : checked ? { ...m, receives_leads: false } : m
      )
    );
    const res = await fetch(`/api/contractor/sales-team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ receives_leads: checked }),
    });
    refresh(); // Sync with server (revert if PATCH failed)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Team</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add team members with photos and contact info. Designate who receives new quote notifications. Team members appear on the thank-you page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white hover:opacity-90"
        >
          Add team member
        </button>
      </div>

      {(showAdd || editingId) && (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="font-bold">{editingId ? 'Edit team member' : 'Add team member'}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-sm font-medium">Photo</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[var(--bg2)]">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-[var(--muted)]">?</div>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-[var(--bg2)] disabled:opacity-50 disabled:cursor-not-allowed">
                    {photoUploading ? 'Uploading...' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                  </label>
                  {photoError && (
                    <p className="mt-1 text-sm text-red-600">{photoError}</p>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-[200px] space-y-3">
                <div>
                  <label className="block text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (555) 123-4567"
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jane@company.com"
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white">
                {editingId ? 'Save' : 'Add'}
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {members.length === 0 && !showAdd && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-12 text-center text-[var(--muted)]">
            No team members yet. Add members so customers can recognize your team when they reach out.
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[var(--bg2)]">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--muted)]">
                    {m.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate block">{m.name}</span>
                </div>
                {m.title && <div className="text-sm text-[var(--muted)] truncate">{m.title}</div>}
                {(m.phone || m.email) && (
                  <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-3 text-sm">
                    {m.phone && <a href={`tel:${m.phone}`} className="text-[var(--accent)] hover:underline truncate">{m.phone}</a>}
                    {m.email && <a href={`mailto:${m.email}`} className="text-[var(--accent)] hover:underline truncate">{m.email}</a>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto pt-2 sm:pt-0 border-t border-[var(--line)] sm:border-0">
              {m.email && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--bg2)]">
                  <input
                    type="checkbox"
                    checked={m.receives_leads === true}
                    onChange={(e) => handleSetLeadRecipient(m.id, e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)]"
                  />
                  <span>Receives leads</span>
                </label>
              )}
              <button
                type="button"
                onClick={() => startEdit(m)}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-[var(--bg2)]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
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
