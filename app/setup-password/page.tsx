'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

function authLooksPendingInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  if (/access_token|refresh_token/.test(hash)) return true;
  if (new URLSearchParams(window.location.search).has('code')) return true;
  return false;
}

export default function SetupPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const pendingAuth = authLooksPendingInUrl();
    let resolved = false;

    const markReady = (session: Session | null, force: boolean) => {
      if (resolved) return;
      if (!session && pendingAuth && !force) return;
      resolved = true;
      setHasSession(!!session);
      setReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        markReady(session, false);
      }
      if (event === 'SIGNED_IN' && session) {
        markReady(session, true);
      }
    });

    void (async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          window.history.replaceState({}, document.title, window.location.pathname);
          const { data } = await supabase.auth.getSession();
          markReady(data.session, true);
          return;
        }
      }
    })();

    const fallbackMs = pendingAuth ? 4000 : 800;
    const t = setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        markReady(data.session, true);
      });
    }, fallbackMs);

    return () => {
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || 'Failed to set password.');
      setSaving(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading...</div>;
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold tracking-tight">Set your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your invite link may have expired. Ask your admin to click <strong>Invite again</strong> and open the newest email.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Create your password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set your password for your company account access.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
          {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}

