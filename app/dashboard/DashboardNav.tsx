'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/settings', label: 'Company & branding' },
  { href: '/dashboard/sales-team', label: 'Sales Team' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/calculator', label: 'Quote calculator' },
  { href: '/dashboard/customers', label: 'Customers' },
  { href: '/dashboard/layout', label: 'Layout' },
];

export function DashboardNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="flex flex-1 flex-row overflow-x-auto md:flex-col gap-2 p-4 md:overflow-visible">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <div className="flex md:mt-auto md:flex-col gap-2 border-l md:border-l-0 md:border-t border-[var(--line)] pl-4 md:pl-0 md:pt-4 ml-2 md:ml-0 items-center md:items-stretch">
        {slug && (
          <a
            href={`/estimate/${slug}/contact`}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            View quote page →
          </a>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="whitespace-nowrap w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
