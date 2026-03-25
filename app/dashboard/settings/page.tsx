'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ADMIN_ROLES = ['owner', 'admin'];

const field =
  'mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const fieldCompact =
  'mt-0.5 w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';

const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/35 px-5 py-4 sm:px-6';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className ?? ''}`} />;
}

function CompleteSetupForm({
  apiError,
  onSuccess,
}: {
  apiError: string | null;
  onSuccess: () => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contractor/complete-setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          slug: slug || slugify(companyName),
          primary_color: primaryColor,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      <div className={cardShell}>
        <div className={cardHeader}>
          <h1 className="text-lg font-bold text-slate-900">Complete your setup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your account exists but your company profile wasn&apos;t created yet.
          </p>
        </div>
        <div className="p-6">
          {apiError && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{apiError}</p>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (!slug || slugify(slug) === slugify(companyName)) setSlug(slugify(e.target.value));
                }}
                required
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Quote page URL slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="your-company"
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Accent color</label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200/90 shadow-sm"
                />
                <span className="text-sm font-mono text-slate-600">{primaryColor}</span>
              </div>
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create company profile'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            Or{' '}
            <a href="/login" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">
              log out
            </a>{' '}
            and sign up again.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractor, setContractor] = useState<{
    id: string;
    company_name: string;
    slug: string;
    email: string;
    phone: string | null;
    website: string | null;
    address_line_1: string | null;
    city: string | null;
    province_state: string | null;
    postal_zip: string | null;
    logo_url: string | null;
    primary_color: string | null;
    quote_notification_email: string | null;
    user_role?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teamUsers, setTeamUsers] = useState<{ id: string; first_name: string; last_name: string; email: string; role: string; is_active: boolean }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('sales');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);
  const isAdmin = contractor?.user_role === 'owner' || contractor?.user_role === 'admin';

  useEffect(() => {
    fetch('/api/contractor/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          if (!ADMIN_ROLES.includes(data.user_role || '')) {
            router.replace('/dashboard');
            return;
          }
          setContractor(data);
          setApiError(null);
        } else {
          setApiError(data.error || 'Could not load contractor');
        }
        setLoading(false);
      })
      .catch(() => {
        setApiError('Network error. Please try again.');
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/contractor/users', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setTeamUsers(data.users || []))
      .catch(() => {});
  }, [isAdmin]);

  function slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleCompanyChange(v: string) {
    if (!contractor) return;
    const shouldSyncSlug =
      !contractor.slug || slugify(contractor.slug) === slugify(contractor.company_name);
    setContractor({
      ...contractor,
      company_name: v,
      slug: shouldSyncSlug ? slugify(v) : contractor.slug,
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contractor) return;
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'logo');
    const res = await fetch('/api/contractor/upload', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      const patchRes = await fetch('/api/contractor/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: data.url }),
      });
      if (patchRes.ok) {
        setContractor({ ...contractor, logo_url: data.url });
        router.refresh();
      } else {
        setError('Logo saved locally but failed to update. Try Save changes.');
      }
    } else {
      setError(data.error || 'Upload failed');
    }
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractor) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/contractor/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: contractor.company_name,
          slug: contractor.slug || slugify(contractor.company_name),
          phone: contractor.phone || null,
          website: contractor.website || null,
          address_line_1: contractor.address_line_1 || null,
          city: contractor.city || null,
          province_state: contractor.province_state || null,
          postal_zip: contractor.postal_zip || null,
          quote_notification_email: contractor.quote_notification_email || null,
          logo_url: contractor.logo_url || null,
          primary_color: contractor.primary_color || '#2563eb',
          secondary_color: contractor.primary_color,
          accent_color: contractor.primary_color,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Update failed');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 pb-10">
        <Skeleton className="h-9 w-80 rounded-xl" />
        <Skeleton className="h-4 max-w-md rounded-md" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="mx-auto max-w-6xl pb-10">
        <CompleteSetupForm apiError={apiError} onSuccess={() => window.location.reload()} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg">
        <div className={cardShell}>
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.621 10.5h10.242a1.5 1.5 0 001.06-2.56l-5.121-5.12a1.5 1.5 0 00-2.121 0l-5.121 5.12a1.5 1.5 0 001.06 2.56z"
                />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-900">No access</p>
            <p className="mt-2 text-sm text-slate-600">You don&apos;t have permission to change company settings.</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-10 pb-10">
      <div className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-blue-500/[0.07] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-16 top-40 h-48 w-48 rounded-full bg-indigo-500/[0.05] blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-8 border-b border-slate-200/70 pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex gap-5">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 sm:flex">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a7.723 7.723 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Administration</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Company &amp; branding</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Logo, accent color, business details, and dashboard logins for your crew.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/sales-team"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            Sales team
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={cardShell}>
          <div className={cardHeader}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" aria-hidden />
              <h2 className="text-base font-semibold text-slate-900">Logo</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Shown in the header of your public quote page</p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-slate-50 shadow-inner">
                {contractor.logo_url ? (
                  <img src={contractor.logo_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full" style={{ background: contractor.primary_color || '#2563eb' }} />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Upload logo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className={cardHeader}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500 shadow-sm shadow-violet-500/40" aria-hidden />
              <h2 className="text-base font-semibold text-slate-900">Accent color</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Buttons and highlights on your quote page</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
            <input
              type="color"
              value={contractor.primary_color || '#2563eb'}
              onChange={(e) =>
                setContractor({
                  ...contractor,
                  primary_color: e.target.value,
                })
              }
              className="h-14 w-20 cursor-pointer rounded-xl border border-slate-200/90 shadow-sm"
            />
            <span className="font-mono text-sm text-slate-600">{contractor.primary_color || '#2563eb'}</span>
          </div>
        </div>

        <div className={cardShell}>
          <div className={cardHeader}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" aria-hidden />
              <h2 className="text-base font-semibold text-slate-900">Company info</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">How you appear on quotes and notifications</p>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Company name</label>
              <input
                type="text"
                value={contractor.company_name}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Quote page URL</label>
              <div className="mt-2 flex items-center rounded-xl border border-slate-200/90 bg-slate-50/90 shadow-sm">
                <span className="pl-3.5 text-sm font-medium text-slate-500">/estimate/</span>
                <input
                  type="text"
                  value={contractor.slug}
                  onChange={(e) => setContractor({ ...contractor, slug: e.target.value })}
                  placeholder="your-company"
                  className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={contractor.email}
                readOnly
                disabled
                className={`${field} cursor-not-allowed bg-slate-50 text-slate-600 opacity-90`}
              />
              <p className="mt-1.5 text-xs text-slate-500">Set at signup. Contact support to change.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Quote notification email</label>
              <input
                type="email"
                value={contractor.quote_notification_email || ''}
                onChange={(e) =>
                  setContractor({
                    ...contractor,
                    quote_notification_email: e.target.value.trim() || null,
                  })
                }
                placeholder={contractor.email}
                className={field}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                New submissions go here. Leave blank to use your login email.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <input
                type="tel"
                value={contractor.phone || ''}
                onChange={(e) => setContractor({ ...contractor, phone: e.target.value || null })}
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Website</label>
              <input
                type="url"
                value={contractor.website || ''}
                onChange={(e) => setContractor({ ...contractor, website: e.target.value || null })}
                placeholder="https://"
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input
                type="text"
                value={contractor.address_line_1 || ''}
                onChange={(e) => setContractor({ ...contractor, address_line_1: e.target.value || null })}
                className={field}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">City</label>
                <input
                  type="text"
                  value={contractor.city || ''}
                  onChange={(e) => setContractor({ ...contractor, city: e.target.value || null })}
                  className={field}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Province / State</label>
                <input
                  type="text"
                  value={contractor.province_state || ''}
                  onChange={(e) => setContractor({ ...contractor, province_state: e.target.value || null })}
                  className={field}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Postal / ZIP</label>
              <input
                type="text"
                value={contractor.postal_zip || ''}
                onChange={(e) => setContractor({ ...contractor, postal_zip: e.target.value || null })}
                className={field}
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className={cardShell}>
            <div className={cardHeader}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40" aria-hidden />
                <h2 className="text-base font-semibold text-slate-900">Team users</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Dashboard logins — admins manage catalog and prices; sales and estimators use leads and the calculator.
              </p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5">
                <h3 className="text-sm font-semibold text-slate-900">Add user</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className={fieldCompact}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Password</label>
                    <input
                      type="password"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className={fieldCompact}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">First name</label>
                    <input
                      type="text"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      placeholder="Jane"
                      className={fieldCompact}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Last name</label>
                    <input
                      type="text"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      placeholder="Smith"
                      className={fieldCompact}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className={fieldCompact}
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="estimator">Estimator</option>
                    </select>
                  </div>
                </div>
                {inviteError && (
                  <p className="mt-3 text-sm font-medium text-red-600">{inviteError}</p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!inviteEmail.trim() || invitePassword.length < 6) return;
                    setInviteError(null);
                    setInviting(true);
                    try {
                      const res = await fetch('/api/contractor/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: inviteEmail.trim(),
                          password: invitePassword,
                          first_name: inviteFirstName.trim(),
                          last_name: inviteLastName.trim(),
                          role: inviteRole,
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setInviteEmail('');
                        setInvitePassword('');
                        setInviteFirstName('');
                        setInviteLastName('');
                        setInviteRole('sales');
                        const listRes = await fetch('/api/contractor/users');
                        const listData = await listRes.json();
                        setTeamUsers(listData.users || []);
                      } else {
                        setInviteError(data.error || 'Failed to create user');
                      }
                    } catch {
                      setInviteError('Network error');
                    } finally {
                      setInviting(false);
                    }
                  }}
                  disabled={inviting || !inviteEmail.trim() || invitePassword.length < 6}
                  className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {inviting ? 'Creating…' : 'Create user'}
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Current users</h3>
                <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                  {teamUsers.map((u) => (
                    <li
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50/80"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-slate-900">
                          {u.first_name} {u.last_name}
                        </span>
                        <span className="ml-2 text-slate-500">({u.email})</span>
                        <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {u.role}
                        </span>
                        {!u.is_active && (
                          <span className="ml-2 text-xs font-semibold text-red-600">Inactive</span>
                        )}
                      </span>
                      {u.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={async (e) => {
                              const r = e.target.value;
                              const res = await fetch(`/api/contractor/users/${u.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: r }),
                              });
                              if (res.ok) {
                                const listRes = await fetch('/api/contractor/users');
                                const listData = await listRes.json();
                                setTeamUsers(listData.users || []);
                              }
                            }}
                            className="rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                          >
                            <option value="admin">Admin</option>
                            <option value="sales">Sales</option>
                            <option value="estimator">Estimator</option>
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(u.is_active ? 'Deactivate this user?' : 'Reactivate this user?')) return;
                              const res = await fetch(`/api/contractor/users/${u.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ is_active: !u.is_active }),
                              });
                              if (res.ok) {
                                const listRes = await fetch('/api/contractor/users');
                                const listData = await listRes.json();
                                setTeamUsers(listData.users || []);
                              }
                            }}
                            className={`text-xs font-semibold ${u.is_active ? 'text-red-600 hover:underline' : 'text-blue-600 hover:underline'}`}
                          >
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-60 active:scale-[0.98]"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
