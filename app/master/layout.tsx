import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: master } = await supabase
    .from('master_admins')
    .select('id, email')
    .eq('auth_id', user.id)
    .single();

  if (!master) redirect('/dashboard');

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row bg-[var(--bg2)] overflow-hidden w-full fixed inset-0">
      <div className="md:hidden flex items-center justify-between gap-2 bg-white border-b border-[var(--line)] px-4 py-3 shrink-0">
        <div className="font-semibold">Master Admin</div>
        <div className="flex gap-2">
          <Link href="/master" className="text-sm text-[var(--accent)] font-medium">Requests</Link>
          <Link href="/master/products" className="text-sm text-[var(--muted)]">Products</Link>
        </div>
      </div>
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--line)] bg-white shrink-0">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4 shrink-0">
          <div className="h-10 w-10 rounded-lg bg-[var(--accent)]" />
          <div>
            <div className="font-semibold">Master Admin</div>
            <div className="text-xs text-[var(--muted)] truncate">{master.email}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <Link
            href="/master"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Material quote requests
          </Link>
          <Link
            href="/master/products"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Products
          </Link>
          <a
            href="/logout"
            className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 pt-4 border-t border-[var(--line)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg2)]">
        {children}
      </main>
    </div>
  );
}
