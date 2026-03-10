'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { 
    href: '/dashboard', 
    label: 'Overview',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  },
  { 
    href: '/dashboard/customers', 
    label: 'Leads',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  },
  { 
    href: '/dashboard/calculator', 
    label: 'Quote',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5A2.25 2.25 0 0 0 19.5 19.5V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
  },
  { 
    href: '/dashboard/layout', 
    label: 'Draw',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
  },
  { 
    href: '/dashboard/material-calculator', 
    label: 'Materials',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />,
    disabled: true, // being worked on
  },
  { 
    href: '/dashboard/products', 
    label: 'Products',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />,
  },
  { 
    href: '/dashboard/settings', 
    label: 'Settings',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />,
    adminOnly: true,
  },
  { 
    href: '/dashboard/sales-team', 
    label: 'Team',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />,
    adminOnly: true,
  },
];

const ADMIN_ROLES = ['owner', 'admin'];

export function DashboardNav({ slug, userRole, isMobile = false }: { slug: string; userRole: string | null; isMobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = userRole && ADMIN_ROLES.includes(userRole);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (isMobile) {
    return (
      <nav className="flex w-full items-center justify-around px-1 py-2 no-scrollbar">
        {links.filter((l) => !('adminOnly' in l && l.adminOnly) || isAdmin).map((link) => {
          const disabled = 'disabled' in link && link.disabled;
          const isActive = !disabled && (pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/')));
          const baseClass = `flex flex-col items-center gap-1 rounded-2xl p-1.5 transition w-[16%] ${
            disabled
              ? 'cursor-not-allowed text-[#94a3b8] opacity-60'
              : isActive
                ? 'text-[var(--accent)]'
                : 'text-[#94a3b8] hover:text-[var(--text)] active:bg-gray-100'
          }`;
          const content = (
            <>
              <svg className={`h-6 w-6 ${isActive ? 'stroke-[2.5px] fill-[var(--accent)]/10' : 'stroke-[1.5px]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {link.icon}
              </svg>
              <span className={`text-[9px] sm:text-[10px] tracking-tight ${disabled ? 'line-through' : ''} ${isActive ? 'font-semibold' : 'font-medium'}`}>{link.label}</span>
            </>
          );
          return disabled ? (
            <span key={link.href} className={baseClass} title="Coming soon">
              {content}
            </span>
          ) : (
            <Link key={link.href} href={link.href} className={baseClass}>
              {content}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-2 p-4">
      {links.filter((l) => !('adminOnly' in l && l.adminOnly) || isAdmin).map((link) => {
        const disabled = 'disabled' in link && link.disabled;
        const isActive = !disabled && (pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/')));
        const baseClass = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          disabled
            ? 'cursor-not-allowed text-[var(--muted)] opacity-60'
            : isActive
              ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]'
        }`;
        const content = (
          <>
            <svg className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {link.icon}
            </svg>
            <span className={disabled ? 'line-through' : ''}>{link.label}</span>
          </>
        );
        return disabled ? (
          <span key={link.href} className={baseClass} title="Coming soon">
            {content}
          </span>
        ) : (
          <Link key={link.href} href={link.href} className={baseClass}>
            {content}
          </Link>
        );
      })}
      
      <div className="mt-6 flex flex-col gap-2 border-t border-[var(--line)] pt-4">
        {slug && (
          <a
            href={`/estimate/${slug}/contact`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            <svg className="h-5 w-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            View quote page
          </a>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted)] hover:bg-red-50 hover:text-red-600 transition"
        >
          <svg className="h-5 w-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Log out
        </button>
      </div>
    </nav>
  );
}
