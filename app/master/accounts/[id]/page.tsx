'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

type TeamUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  auth_id: string | null;
  created_at: string | null;
};

type ContractorRow = Record<string, unknown> & {
  id: string;
  company_name: string;
  email: string;
  slug: string;
  account_type?: string;
  phone?: string | null;
  website?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  province_state?: string | null;
  postal_zip?: string | null;
  country?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  quote_notification_email?: string | null;
  quote_range_pct?: number | null;
  billing_access_override?: boolean | null;
  billing_access_override_note?: string | null;
  is_active?: boolean | null;
};

const field =
  'mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-[var(--text)] shadow-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20';

function buildPatchBody(c: ContractorRow) {
  return {
    company_name: c.company_name,
    slug: (c.slug || '').trim().toLowerCase(),
    email: String(c.email || '').trim().toLowerCase(),
    phone: c.phone || null,
    website: c.website || null,
    address_line_1: c.address_line_1 || null,
    city: c.city || null,
    province_state: c.province_state || null,
    postal_zip: c.postal_zip || null,
    country: c.country || 'CA',
    logo_url: c.logo_url || null,
    primary_color: c.primary_color || '#2563eb',
    secondary_color: c.primary_color || '#2563eb',
    accent_color: c.primary_color || '#2563eb',
    quote_notification_email: c.quote_notification_email?.toString().trim() || null,
    quote_range_pct: c.quote_range_pct ?? 5,
    billing_access_override: c.billing_access_override === true,
    billing_access_override_note: c.billing_access_override_note?.toString().trim() || null,
    is_active: c.is_active !== false,
  };
}

export default function MasterAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contractor, setContractor] = useState<ContractorRow | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);

  const contractorRef = useRef(contractor);
  contractorRef.current = contractor;
  const lastSavedJson = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/contractors/${id}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to load');
        setContractor(null);
        setUsers([]);
        return;
      }
      setContractor(data.contractor as ContractorRow);
      setUsers(data.users || []);
      lastSavedJson.current = JSON.stringify(buildPatchBody(data.contractor as ContractorRow));
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!contractor || loading) return;
    const json = JSON.stringify(buildPatchBody(contractor));
    if (lastSavedJson.current === null) {
      lastSavedJson.current = json;
      return;
    }
    if (lastSavedJson.current === json) return;
    if (!contractor.company_name?.trim()) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const cur = contractorRef.current;
      if (!cur?.company_name?.trim()) return;
      const body = buildPatchBody(cur);
      setSaveStatus('saving');
      setError(null);
      try {
        const res = await fetch(`/api/master/contractors/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Save failed');
          setSaveStatus('idle');
          return;
        }
        setContractor(data as ContractorRow);
        lastSavedJson.current = JSON.stringify(buildPatchBody(data as ContractorRow));
        const reload = await fetch(`/api/master/contractors/${id}`, { credentials: 'include' });
        const full = await reload.json().catch(() => ({}));
        if (reload.ok && full.users) setUsers(full.users);
        clearTimeout(savedTimer.current);
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setError('Network error while saving');
        setSaveStatus('idle');
      }
    }, 850);

    return () => clearTimeout(saveTimer.current);
  }, [contractor, loading, id]);

  async function deleteUser(userId: string) {
    if (!confirm('Remove this user from the company? Their login will be deleted.')) return;
    setDeletingUserId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/master/contractors/${id}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to remove user');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError('Network error');
    } finally {
      setDeletingUserId(null);
    }
  }

  async function deleteCompany() {
    setDeletingCompany(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/contractors/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to delete company');
        setDeletingCompany(false);
        return;
      }
      const isSupplier = contractor?.account_type === 'supplier';
      router.push(isSupplier ? '/master/suppliers' : '/master/contractors');
      router.refresh();
    } catch {
      setError('Network error');
      setDeletingCompany(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-white p-8">
        <p className="text-sm text-red-600">{error || 'Account not found.'}</p>
        <Link href="/master/contractors" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">
          Back to contractors
        </Link>
      </div>
    );
  }

  const isSupplier = contractor.account_type === 'supplier';
  const listHref = isSupplier ? '/master/suppliers' : '/master/contractors';
  const listLabel = isSupplier ? 'All suppliers' : 'All contractors';

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={listHref} className="text-sm font-medium text-[var(--accent)] hover:underline">
            ← {listLabel}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{contractor.company_name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isSupplier ? 'Supplier' : 'Contractor'} · /{contractor.slug}
          </p>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && <span className="text-emerald-600">Saved</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Company &amp; account</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Changes save automatically.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Company name</label>
            <input
              type="text"
              value={contractor.company_name}
              onChange={(e) => setContractor({ ...contractor, company_name: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Account email</label>
            <input
              type="email"
              value={contractor.email}
              onChange={(e) => setContractor({ ...contractor, email: e.target.value })}
              className={field}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Updates company email and matching dashboard logins (team members whose email matched the previous
              company email).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">Quote page slug</label>
            <div className="mt-1.5 flex items-center rounded-xl border border-[var(--line)] bg-[var(--bg2)]/50">
              <span className="pl-3 text-sm text-[var(--muted)]">/estimate/</span>
              <input
                type="text"
                value={contractor.slug || ''}
                onChange={(e) => setContractor({ ...contractor, slug: e.target.value })}
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Quote notification email</label>
            <input
              type="email"
              value={contractor.quote_notification_email?.toString() || ''}
              onChange={(e) =>
                setContractor({
                  ...contractor,
                  quote_notification_email: e.target.value.trim() || null,
                })
              }
              placeholder={contractor.email}
              className={field}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                type="tel"
                value={contractor.phone?.toString() || ''}
                onChange={(e) => setContractor({ ...contractor, phone: e.target.value || null })}
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Website</label>
              <input
                type="text"
                value={contractor.website?.toString() || ''}
                onChange={(e) => setContractor({ ...contractor, website: e.target.value || null })}
                className={field}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input
              type="text"
              value={contractor.address_line_1?.toString() || ''}
              onChange={(e) => setContractor({ ...contractor, address_line_1: e.target.value || null })}
              className={field}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">City</label>
              <input
                type="text"
                value={contractor.city?.toString() || ''}
                onChange={(e) => setContractor({ ...contractor, city: e.target.value || null })}
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Province / state</label>
              <input
                type="text"
                value={contractor.province_state?.toString() || ''}
                onChange={(e) => setContractor({ ...contractor, province_state: e.target.value || null })}
                className={field}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Postal / ZIP</label>
            <input
              type="text"
              value={contractor.postal_zip?.toString() || ''}
              onChange={(e) => setContractor({ ...contractor, postal_zip: e.target.value || null })}
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Logo URL</label>
            <input
              type="url"
              value={contractor.logo_url?.toString() || ''}
              onChange={(e) => setContractor({ ...contractor, logo_url: e.target.value || null })}
              className={field}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium">Accent color</label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="color"
                  value={(contractor.primary_color as string) || '#2563eb'}
                  onChange={(e) => setContractor({ ...contractor, primary_color: e.target.value })}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-[var(--line)]"
                />
                <span className="font-mono text-sm text-[var(--muted)]">{String(contractor.primary_color || '')}</span>
              </div>
            </div>
            <div className="flex-1 min-w-[8rem]">
              <label className="block text-sm font-medium">Quote range %</label>
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={contractor.quote_range_pct ?? 5}
                onChange={(e) =>
                  setContractor({ ...contractor, quote_range_pct: Number(e.target.value) || 5 })
                }
                className={field}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg2)]/40 p-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={contractor.billing_access_override === true}
                onChange={(e) =>
                  setContractor({ ...contractor, billing_access_override: e.target.checked })
                }
              />
              Free access (billing override)
            </label>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Override note</label>
              <input
                type="text"
                value={contractor.billing_access_override_note?.toString() || ''}
                onChange={(e) =>
                  setContractor({ ...contractor, billing_access_override_note: e.target.value || null })
                }
                className={field}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={contractor.is_active !== false}
                onChange={(e) => setContractor({ ...contractor, is_active: e.target.checked })}
              />
              Company active
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Team users</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Deleting a user removes their login. If you remove an owner, another user is promoted to owner first.
        </p>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">
                  {u.first_name} {u.last_name}
                  <span className="ml-2 text-xs font-normal text-[var(--muted)]">({u.role})</span>
                </div>
                <div className="text-sm text-[var(--muted)]">{u.email}</div>
                {!u.is_active && <span className="text-xs text-amber-700">Inactive</span>}
              </div>
              <button
                type="button"
                disabled={deletingUserId === u.id}
                onClick={() => deleteUser(u.id)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingUserId === u.id ? 'Removing…' : 'Remove user'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <h2 className="text-lg font-semibold text-red-900">Delete company</h2>
        <p className="mt-1 text-sm text-red-800/90">
          Permanently deletes this company, all leads, products, and every team login. This cannot be undone.
        </p>
        {confirmDeleteCompany ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={deletingCompany}
              onClick={deleteCompany}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60"
            >
              {deletingCompany ? 'Deleting…' : 'Yes, delete forever'}
            </button>
            <button
              type="button"
              disabled={deletingCompany}
              onClick={() => setConfirmDeleteCompany(false)}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDeleteCompany(true)}
            className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Delete this company…
          </button>
        )}
      </section>
    </div>
  );
}
