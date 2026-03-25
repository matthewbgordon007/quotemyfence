import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, canonical, SEO_DEFAULTS } from '@/lib/seo';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';

export const metadata: Metadata = {
  title: 'Partners & Link to Us | QuoteMyFence',
  description:
    'Add a QuoteMyFence badge or link to your site. Free HTML snippets for fence contractors, suppliers, and industry partners. Grow backlinks and help your audience find fence estimate software.',
  keywords: [
    'QuoteMyFence partners',
    'fence contractor affiliate badge',
    'fence industry backlinks',
    ...SEO_DEFAULTS.keywords.slice(0, 8),
  ],
  openGraph: {
    ...SEO_DEFAULTS.openGraph,
    url: canonical('/partners'),
    title: 'Partners & Link to Us | QuoteMyFence',
    description: 'Free badges and links for contractors, suppliers, and fence industry partners.',
  },
  twitter: {
    ...SEO_DEFAULTS.twitter,
    title: 'Partners | QuoteMyFence',
    description: 'Free widgets and links for fence contractors and industry partners.',
  },
  alternates: { canonical: canonical('/partners') },
};

const badgeSnippet = (label: string) =>
  `<a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" title="Fence estimate software for contractors">${label}</a>`;

export default function PartnersPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
              radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.06) 0px, transparent 50%)`,
          }}
        />
      </div>

      <div className="w-full safe-area-x py-6 sm:px-8 lg:px-12 xl:px-16">
        <nav className="safe-area-t flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
          <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-90" aria-label="QuoteMyFence home">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link href="/blog" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">Blog</Link>
            <Link href="/press" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-600">Press</Link>
            <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">Member login</Link>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
              Book a call
            </a>
            <Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
              Sign up
            </Link>
          </div>
        </nav>

        <main id="main-content" className="mx-auto max-w-3xl pt-12 pb-16 sm:pt-24">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Partners & <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">link to us</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Contractors, suppliers, and industry sites: add a link or badge to QuoteMyFence. Free, no signup. Copy the code below and paste it on your website or blog.
          </p>

          <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-xl font-bold text-slate-900">Text link</h2>
            <p className="mt-2 text-slate-600 text-sm">Simple link—works everywhere (footers, blog posts, resource pages).</p>
            <p className="mt-4 text-slate-700 font-mono text-sm break-all">
              {badgeSnippet('QuoteMyFence – Fence estimate software for contractors')}
            </p>
            <div className="mt-4">
              <label className="sr-only" htmlFor="snippet-text">Copy HTML</label>
              <textarea
                id="snippet-text"
                readOnly
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700"
                value={`<a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" title="Fence estimate software for contractors">QuoteMyFence – Fence estimate software for contractors</a>`}
              />
              <p className="mt-2 text-xs text-slate-600">Copy the code above and paste it into your site’s HTML or footer.</p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-xl font-bold text-slate-900">“Powered by” badge</h2>
            <p className="mt-2 text-slate-600 text-sm">For contractor or partner sites that use or recommend QuoteMyFence.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <img src="/quotemyfence-logo.png" alt="" className="h-10 w-10 rounded object-contain" />
              <span className="text-slate-600">Powered by </span>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:text-blue-500">
                QuoteMyFence
              </a>
            </div>
            <div className="mt-4">
              <textarea
                readOnly
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700"
                value={`<a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" title="Fence estimate software for contractors" style="display:inline-flex;align-items:center;gap:6px;">
  <img src="${SITE_URL}/quotemyfence-logo.png" alt="QuoteMyFence" width="24" height="24" />
  Powered by <strong>QuoteMyFence</strong>
</a>`}
              />
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-xl font-bold text-slate-900">Button: “Get a fence quote”</h2>
            <p className="mt-2 text-slate-600 text-sm">Call-to-action for resource pages or blog sidebars.</p>
            <div className="mt-6">
              <a
                href={SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
              >
                Get a fence quote
              </a>
            </div>
            <div className="mt-4">
              <textarea
                readOnly
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700"
                value={`<a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">Get a fence quote</a>`}
              />
            </div>
          </section>

          <p className="mt-10 text-slate-600 text-sm">
            By linking to QuoteMyFence you help contractors and homeowners discover instant fence estimates. If you’d like a custom partnership (e.g. co-branded landing page or affiliate program),{' '}
            <a href={`mailto:${SEO_DEFAULTS.organization.email}`} className="text-blue-600 hover:text-blue-500">
              contact us
            </a>.
          </p>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link href="/" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900">
              Back to home
            </Link>
            <Link href="/press" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500">
              Press & media
            </Link>
          </div>
        </main>

        <footer className="safe-area-b mt-12 border-t border-slate-200 bg-white/80 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center opacity-80 hover:opacity-100">
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-8 w-auto" />
            </Link>
            <div className="flex gap-6 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <Link href="/blog" className="hover:text-slate-900">Blog</Link>
              <Link href="/press" className="hover:text-slate-900">Press</Link>
              <Link href="/partners" className="hover:text-slate-900">Partners</Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600">© {new Date().getFullYear()} QuoteMyFence. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
