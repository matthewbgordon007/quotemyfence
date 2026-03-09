import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DashboardNav } from './DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  const contractor = userRow?.contractor_id
    ? await supabase
        .from('contractors')
        .select('id, company_name, slug, logo_url, primary_color')
        .eq('id', userRow.contractor_id)
        .single()
    : { data: null };

  const c = contractor.data;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--bg2)]">
      <aside className="flex w-full md:w-64 flex-col border-b md:border-b-0 md:border-r border-[var(--line)] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
          {c?.logo_url ? (
            <img
              src={c.logo_url}
              alt={c.company_name}
              className="h-10 w-10 rounded-lg object-contain"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-lg"
              style={{
                background: c?.primary_color || 'var(--accent)',
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{c?.company_name}</div>
            <div className="truncate text-xs text-[var(--muted)]">
              /estimate/{c?.slug}
            </div>
          </div>
        </div>
        <DashboardNav slug={c?.slug ?? ''} />
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
