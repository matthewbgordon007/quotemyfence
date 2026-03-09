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
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-[var(--line)] pt-4">
        {slug && (
          <a
            href={`/estimate/${slug}/contact`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
          >
            View quote page →
          </a>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
