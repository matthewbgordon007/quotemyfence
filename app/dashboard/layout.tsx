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
    <div className="flex h-[100dvh] flex-col md:flex-row bg-[var(--bg2)] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 border-b border-[var(--line)] bg-white p-3 shrink-0">
        {c?.logo_url ? (
          <img
            src={c.logo_url}
            alt={c.company_name}
            className="h-8 w-8 rounded-lg object-contain"
          />
        ) : (
          <div
            className="h-8 w-8 rounded-lg"
            style={{
              background: c?.primary_color || 'var(--accent)',
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-sm">{c?.company_name}</div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--line)] bg-white shrink-0">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4 shrink-0">
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
        <div className="flex-1 overflow-y-auto">
          <DashboardNav slug={c?.slug ?? ''} isMobile={false} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6 relative webkit-scrolling">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--line)] bg-white/90 backdrop-blur-md z-50 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        <DashboardNav slug={c?.slug ?? ''} isMobile={true} />
      </div>
    </div>
  );
}
