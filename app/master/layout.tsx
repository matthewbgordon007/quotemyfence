import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionMasterAdmin } from '@/lib/master-auth';

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionMasterAdmin();
  if (!session) redirect('/dashboard');

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden w-full fixed inset-0 bg-[var(--bg2)] md:flex-row">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-white px-4 py-3 md:hidden">
        <div className="font-semibold">Master</div>
        <div className="flex gap-3 text-sm">
          <Link href="/master/contractors" className="font-medium text-[var(--accent)]">
            Contractors
          </Link>
          <Link href="/master/suppliers" className="text-[var(--muted)]">
            Suppliers
          </Link>
        </div>
      </div>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--line)] bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4 shrink-0">
          <div className="h-10 w-10 rounded-lg bg-[var(--accent)]" />
          <div className="min-w-0">
            <div className="font-semibold">Master admin</div>
            <div className="truncate text-xs text-[var(--muted)]">{session.email}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <Link
            href="/master/contractors"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5V4H2v16h5m10 0v-2a3 3 0 00-3-3H10a3 3 0 00-3 3v2m10-9a3 3 0 11-6 0 3 3 0 016 0zm-8 0a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Contractors
          </Link>
          <Link
            href="/master/suppliers"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Suppliers
          </Link>
          <a
            href="/logout"
            className="mt-auto flex items-center gap-3 rounded-lg border-t border-[var(--line)] px-3 py-3 pt-4 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Log out
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
