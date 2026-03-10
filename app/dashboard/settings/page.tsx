'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Complete your setup</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Your account exists but your company profile wasn’t created. Enter your company details below.
      </p>
      {apiError && (
        <p className="mt-2 text-sm text-red-600">{apiError}</p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (!slug || slugify(slug) === slugify(companyName)) setSlug(slugify(e.target.value));
            }}
            required
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Quote page URL slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-company"
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Accent color</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Creating...' : 'Create company profile'}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Or <a href="/login" className="text-[var(--accent)] underline">log out</a> and sign up again.
      </p>
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
    fetch('/api/contractor/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
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
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/contractor/users')
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <CompleteSetupForm
        apiError={apiError}
        onSuccess={() => window.location.reload()}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-6">
        <p className="text-[var(--muted)]">You don&apos;t have permission to access settings.</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          ← Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Company & branding</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Your profile, logo, and quote page accent color.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Logo</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Shown in the header of your quote page.
          </p>
          <div className="mt-4 flex items-center gap-6">
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg2)]">
              {contractor.logo_url ? (
                <img
                  src={contractor.logo_url}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: contractor.primary_color || '#2563eb' }}
                />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg2)]"
              >
                Upload logo
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Accent color</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Used for buttons and highlights on your quote page.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="color"
              value={contractor.primary_color || '#2563eb'}
              onChange={(e) =>
                setContractor({
                  ...contractor,
                  primary_color: e.target.value,
                })
              }
              className="h-12 w-16 cursor-pointer rounded-lg border border-[var(--line)]"
            />
            <span className="text-sm text-[var(--muted)]">
              {contractor.primary_color || '#2563eb'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Company info</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Company name</label>
              <input
                type="text"
                value={contractor.company_name}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Quote page URL</label>
              <div className="mt-1 flex items-center rounded-lg border border-[var(--line)] bg-[var(--bg2)]">
                <span className="pl-3 text-sm text-[var(--muted)]">
                  /estimate/
                </span>
                <input
                  type="text"
                  value={contractor.slug}
                  onChange={(e) => setContractor({ ...contractor, slug: e.target.value })}
                  placeholder="your-company"
                  className="flex-1 border-0 bg-transparent px-2 py-2 outline-none focus:ring-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                value={contractor.email}
                readOnly
                disabled
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg2)] px-3 py-2 text-[var(--muted)]"
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Email is set at signup. Contact support to change.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium">Quote notification email</label>
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
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                New quote submissions will be emailed here. Leave blank to use your login email.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                type="tel"
                value={contractor.phone || ''}
                onChange={(e) => setContractor({ ...contractor, phone: e.target.value || null })}
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Website</label>
              <input
                type="url"
                value={contractor.website || ''}
                onChange={(e) => setContractor({ ...contractor, website: e.target.value || null })}
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Address</label>
              <input
                type="text"
                value={contractor.address_line_1 || ''}
                onChange={(e) =>
                  setContractor({ ...contractor, address_line_1: e.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">City</label>
                <input
                  type="text"
                  value={contractor.city || ''}
                  onChange={(e) => setContractor({ ...contractor, city: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Province / State</label>
                <input
                  type="text"
                  value={contractor.province_state || ''}
                  onChange={(e) =>
                    setContractor({ ...contractor, province_state: e.target.value || null })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Postal / ZIP</label>
              <input
                type="text"
                value={contractor.postal_zip || ''}
                onChange={(e) =>
                  setContractor({ ...contractor, postal_zip: e.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Team users</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create logins for team members. Set email and password, then share with them. Admins can manage products and prices; sales/estimators see leads and the calculator.
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-[var(--line)] p-4">
                <h3 className="text-sm font-medium">Add user</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="block text-xs text-[var(--muted)]">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="mt-0.5 w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)]">Password</label>
                    <input
                      type="password"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="mt-0.5 w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)]">First name</label>
                    <input
                      type="text"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      placeholder="Jane"
                      className="mt-0.5 w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)]">Last name</label>
                    <input
                      type="text"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      placeholder="Smith"
                      className="mt-0.5 w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)]">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="mt-0.5 w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="estimator">Estimator</option>
                    </select>
                  </div>
                </div>
                {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
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
                  className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90"
                >
                  {inviting ? 'Creating...' : 'Create user'}
                </button>
              </div>
              <div>
                <h3 className="text-sm font-medium">Current users</h3>
                <ul className="mt-2 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
                  {teamUsers.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        {u.first_name} {u.last_name}
                        <span className="ml-2 text-[var(--muted)]">({u.email})</span>
                        {!u.is_active && <span className="ml-1 text-red-600">Inactive</span>}
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
                            className="rounded border border-[var(--line)] px-2 py-0.5 text-xs"
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
                            className={`text-xs ${u.is_active ? 'text-red-600 hover:underline' : 'text-[var(--accent)] hover:underline'}`}
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
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
