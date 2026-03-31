'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CompanyUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'owner' | 'admin' | 'sales' | 'estimator';
  is_active: boolean;
  created_at: string;
};

const ADMIN_ROLES = ['owner', 'admin'];

export default function CompanyUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'sales' | 'estimator'>('sales');

  async function load() {
    const res = await fetch('/api/contractor/users', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/contractor/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((me) => {
        if (!ADMIN_ROLES.includes(me?.user_role || '')) router.replace('/dashboard');
      })
      .catch(() => {});
    load();
  }, [router]);

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/contractor/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          role,
          invite: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('sales');
      await load();
      alert(data.message || 'Invite sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(user: CompanyUser, updates: { role?: string; is_active?: boolean }) {
    const res = await fetch(`/api/contractor/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to update user');
      return;
    }
    const updated = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
  }

  async function resendInvite(user: CompanyUser) {
    setResendingId(user.id);
    try {
      const res = await fetch(`/api/contractor/users/${user.id}/invite`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resend invite');
      alert(data.message || 'Invite email sent');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resend invite');
    } finally {
      setResendingId(null);
    }
  }

  if (loading) return <div className="py-10 text-sm text-slate-600">Loading users...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company users</h1>
        <p className="mt-1 text-sm text-slate-600">
          Invite teammates with their own login. They will access this company account and profile based on role.
        </p>
      </div>

      <form onSubmit={inviteUser} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Invite new user</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'sales' | 'estimator')}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="sales">Sales</option>
            <option value="estimator">Estimator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Sending invite...' : 'Send invite'}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User'}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {u.role === 'owner' ? (
                    <span className="text-slate-700">Owner</span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u, { role: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5"
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="estimator">Estimator</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role === 'owner' ? (
                    <span className="text-xs font-semibold text-slate-700">Always active</span>
                  ) : (
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={u.is_active}
                        onChange={(e) => updateUser(u, { is_active: e.target.checked })}
                      />
                      <span className="text-xs font-semibold text-slate-700">{u.is_active ? 'Active' : 'Disabled'}</span>
                    </label>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => resendInvite(u)}
                    disabled={resendingId === u.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {resendingId === u.id ? 'Sending...' : 'Invite again'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No users yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

