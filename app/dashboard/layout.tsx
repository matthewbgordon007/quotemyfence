import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DashboardNav } from './DashboardNav';

function hexToRgb(hex: string | null | undefined): string {
  const raw = String(hex || '').trim().replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '37 99 235';
  const int = Number.parseInt(normalized, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

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
        .select('id, company_name, slug, logo_url, primary_color, account_type')
        .eq('id', userRow.contractor_id)
        .single()
    : { data: null };

  const c = contractor.data;
  const isSupplier = c?.account_type === 'supplier';
  const primary = c?.primary_color || '#2563eb';
  const brandRgb = hexToRgb(primary);

  return (
    <div
      className="fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-100 md:flex-row"
      style={
        {
          ['--dashboard-brand' as string]: primary,
          ['--dashboard-brand-rgb' as string]: brandRgb,
          ['--dashboard-soft' as string]: `rgb(${brandRgb} / 0.10)`,
          ['--dashboard-soft-strong' as string]: `rgb(${brandRgb} / 0.18)`,
          ['--dashboard-line' as string]: `rgb(${brandRgb} / 0.18)`,
          ['--dashboard-ink' as string]: `rgb(${brandRgb} / 0.92)`,
        } as React.CSSProperties
      }
    >
      {/* Mobile Header - More app-like */}
      <div
        className="z-40 shrink-0 border-b px-4 pt-[max(env(safe-area-inset-top),0.875rem)] pb-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md md:hidden"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(255 255 255 / 0.98), rgb(var(--dashboard-brand-rgb) / 0.08), rgb(255 255 255 / 0.96))',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          {c?.logo_url ? (
            <img
              src={c.logo_url}
              alt={c.company_name}
              className="h-7 w-7 rounded-md object-contain"
            />
          ) : null}
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-base font-semibold tracking-tight text-[var(--text)]">
              {c?.company_name || 'QuoteMyFence'}
            </div>
            {isSupplier && (
              <span className="shrink-0 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                Supplier
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="hidden w-[17rem] shrink-0 flex-col shadow-[4px_0_32px_-12px_rgba(15,23,42,0.08)] md:flex"
        style={{
          borderRight: '1px solid var(--dashboard-line)',
          background:
            'linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(var(--dashboard-brand-rgb) / 0.05) 24%, rgb(255 255 255 / 0.98) 58%)',
        }}
      >
        <div
          className="relative flex shrink-0 items-center gap-3 overflow-hidden p-4"
          style={{
            borderBottom: '1px solid var(--dashboard-line)',
            background:
              'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.16), rgb(255 255 255 / 0.96) 45%, rgb(var(--dashboard-brand-rgb) / 0.06))',
          }}
        >
          {c?.logo_url ? (
            <img
              src={c.logo_url}
              alt=""
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rotate-[-12deg] object-contain opacity-[0.08]"
            />
          ) : null}
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
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold tracking-tight text-slate-900">{c?.company_name}</span>
              {isSupplier && (
                <span className="shrink-0 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                  Supplier
                </span>
              )}
            </div>
            <div className="truncate font-mono text-[11px] text-slate-500">/{c?.slug}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardNav
            slug={c?.slug ?? ''}
            userRole={userRow?.role ?? null}
            accountType={c?.account_type ?? 'contractor'}
            isMobile={false}
          />
        </div>
        <div className="px-4 pb-4">
          <div
            className="rounded-2xl p-3 text-xs text-slate-600 shadow-sm"
            style={{
              border: '1px solid var(--dashboard-line)',
              background: 'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.10), rgb(255 255 255 / 0.96))',
            }}
          >
            <p className="font-semibold text-slate-900">{c?.company_name || 'QuoteMyFence'}</p>
            <p className="mt-1">Branded workspace active</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        id="main-content"
        className="relative flex-1 overflow-y-auto p-4 pb-32 [-webkit-overflow-scrolling:touch] md:p-8 md:pb-8"
        style={{
          background:
            'radial-gradient(circle at top right, rgb(var(--dashboard-brand-rgb) / 0.14), transparent 28%), radial-gradient(circle at top left, rgb(var(--dashboard-brand-rgb) / 0.08), transparent 22%), linear-gradient(180deg, rgb(248 250 252 / 0.96), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.04) 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{ background: 'linear-gradient(180deg, rgb(var(--dashboard-brand-rgb) / 0.10), transparent 75%)' }}
        />
        <div
          className="pointer-events-none absolute inset-x-8 top-6 hidden h-px md:block"
          style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--dashboard-brand-rgb) / 0.28), transparent)' }}
        />
        {c?.logo_url ? (
          <img
            src={c.logo_url}
            alt=""
            className="pointer-events-none absolute right-8 top-6 hidden h-28 w-28 object-contain opacity-[0.04] md:block"
          />
        ) : null}
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
        style={{ borderColor: 'var(--dashboard-line)' }}
      >
        <DashboardNav
          slug={c?.slug ?? ''}
          userRole={userRow?.role ?? null}
          accountType={c?.account_type ?? 'contractor'}
          isMobile={true}
        />
      </div>
    </div>
  );
}
