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

  const { data: master } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  if (master) redirect('/master');

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id, role')
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
    <div className="flex h-[100dvh] flex-col md:flex-row overflow-hidden w-full fixed inset-0 bg-slate-100">
      {/* Mobile Header - More app-like */}
      <div className="md:hidden flex items-center justify-center gap-2 border-b border-slate-200/90 bg-white/95 pt-[max(env(safe-area-inset-top),0.875rem)] pb-3 px-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md z-40 shrink-0">
        {c?.logo_url ? (
          <img
            src={c.logo_url}
            alt={c.company_name}
            className="h-7 w-7 rounded-md object-contain"
          />
        ) : null}
        <div className="font-semibold text-base tracking-tight text-[var(--text)]">
          {c?.company_name || 'QuoteMyFence'}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[17rem] shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-[4px_0_32px_-12px_rgba(15,23,42,0.08)]">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 p-4">
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
            <div className="truncate font-semibold tracking-tight text-slate-900">{c?.company_name}</div>
            <div className="truncate font-mono text-[11px] text-slate-500">/{c?.slug}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardNav slug={c?.slug ?? ''} userRole={userRow?.role ?? null} isMobile={false} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-y-auto bg-gradient-to-b from-slate-100/90 to-slate-50 p-4 pb-32 [-webkit-overflow-scrolling:touch] md:p-8 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <DashboardNav slug={c?.slug ?? ''} userRole={userRow?.role ?? null} isMobile={true} />
      </div>
    </div>
  );
}
