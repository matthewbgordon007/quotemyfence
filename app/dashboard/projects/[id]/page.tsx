'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Project = {
  id: string;
  name: string;
  notes: string | null;
  address: string | null;
  fence_type_id: string | null;
  fence_style_id: string | null;
  colour_option_id: string | null;
};

type Member = { quote_session_id: string; first_name: string; last_name: string; email: string };

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);
  const [styles, setStyles] = useState<{ id: string; fence_type_id: string; style_name: string }[]>([]);
  const [colours, setColours] = useState<{ id: string; fence_style_id: string; color_name: string }[]>([]);

  useEffect(() => {
    fetch('/api/contractor/product-hierarchy', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => {
        setTypes(Array.isArray(h?.fenceTypes) ? h.fenceTypes : []);
        setStyles(Array.isArray(h?.fenceStyles) ? h.fenceStyles : []);
        setColours(Array.isArray(h?.colourOptions) ? h.colourOptions : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/contractor/projects/${id}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.project) {
          setProject(d.project);
          setMembers(d.members || []);
        } else {
          setProject(null);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveField(updates: Partial<Project>) {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setProject(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-slate-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-sm">Loading project…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-600">Project not found.</p>
        <Link href="/dashboard/customers" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to leads
        </Link>
      </div>
    );
  }

  const stylesForType = project.fence_type_id ? styles.filter((s) => s.fence_type_id === project.fence_type_id) : [];
  const coloursForStyle = project.fence_style_id
    ? colours.filter((c) => c.fence_style_id === project.fence_style_id)
    : [];

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <Link href="/dashboard/customers" className="text-sm font-medium text-blue-600 hover:underline">
        ← Leads &amp; projects
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{project.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Default fence options apply when team members open the calculator for leads in this project.</p>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                defaultValue={project.name}
                key={project.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== project.name) saveField({ name: v });
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input
                defaultValue={project.address || ''}
                key={project.address || ''}
                onBlur={(e) => saveField({ address: e.target.value.trim() || null })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                defaultValue={project.notes || ''}
                key={project.notes || ''}
                rows={4}
                onBlur={(e) => saveField({ notes: e.target.value.trim() || null })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Default fence (catalogue)</h2>
          <p className="mt-1 text-xs text-slate-500">Used as the starting design when quoting leads linked to this project.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Material / type</label>
              <select
                value={project.fence_type_id || ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setProject((p) => (p ? { ...p, fence_type_id: v, fence_style_id: null, colour_option_id: null } : p));
                  saveField({ fence_type_id: v, fence_style_id: null, colour_option_id: null });
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="">—</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Style</label>
              <select
                value={project.fence_style_id || ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setProject((p) => (p ? { ...p, fence_style_id: v, colour_option_id: null } : p));
                  saveField({ fence_style_id: v, colour_option_id: null });
                }}
                disabled={!project.fence_type_id}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm disabled:opacity-50"
              >
                <option value="">—</option>
                {stylesForType.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.style_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Colour</label>
              <select
                value={project.colour_option_id || ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setProject((p) => (p ? { ...p, colour_option_id: v } : p));
                  saveField({ colour_option_id: v });
                }}
                disabled={!project.fence_style_id}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm disabled:opacity-50"
              >
                <option value="">—</option>
                {coloursForStyle.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.color_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {saving && <p className="mt-2 text-xs text-slate-500">Saving…</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Homeowners in this project</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.quote_session_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link href={`/dashboard/customers/${m.quote_session_id}`} className="font-medium text-blue-700 hover:underline">
                    {m.first_name} {m.last_name}
                  </Link>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={async () => {
                    if (!confirm('Remove this lead from the project?')) return;
                    const res = await fetch(
                      `/api/contractor/projects/${id}/members?quote_session_id=${encodeURIComponent(m.quote_session_id)}`,
                      { method: 'DELETE', credentials: 'include' }
                    );
                    if (res.ok) {
                      setMembers((prev) => prev.filter((x) => x.quote_session_id !== m.quote_session_id));
                    }
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
            {members.length === 0 && <li className="py-6 text-sm text-slate-500">No leads linked yet. Assign a project from a lead profile, or add members here later.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
