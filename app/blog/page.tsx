import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL, canonical, SEO_DEFAULTS } from '@/lib/seo';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';

export const metadata: Metadata = {
  title: 'Blog | Fence Contractor Tips, Guides & Lead Generation | QuoteMyFence',
  description:
    'Tips, guides, and insights for fence contractors. Learn how to quote faster, win more leads, and grow your fence business. Instant quotes, satellite mapping, and lead capture.',
  keywords: [
    'fence contractor blog',
    'fence quote tips',
    'fence lead generation',
    'fence estimate software',
    ...SEO_DEFAULTS.keywords.slice(0, 6),
  ],
  openGraph: {
    ...SEO_DEFAULTS.openGraph,
    url: canonical('/blog'),
    title: 'Blog | Fence Contractor Tips & Lead Generation | QuoteMyFence',
    description:
      'Tips, guides, and insights for fence contractors. Quote faster, win more leads, grow your fence business.',
  },
  twitter: {
    ...SEO_DEFAULTS.twitter,
    title: 'Blog | QuoteMyFence',
    description: 'Tips, guides, and insights for fence contractors. Quote faster, win more leads.',
  },
  alternates: { canonical: canonical('/blog') },
};

const blogListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'QuoteMyFence Blog',
  description: 'Tips, guides, and insights for fence contractors. Learn how to quote faster, win more leads, and grow your fence business.',
  url: canonical('/blog'),
  publisher: { '@id': `${SITE_URL}/#organization` },
  blogPost: blogPosts.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    url: canonical(`/blog/${p.slug}`),
    datePublished: p.date,
    author: { '@type': 'Organization', name: p.author },
  })),
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100">
      <JsonLd data={blogListJsonLd} />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
              radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.06) 0px, transparent 50%),
              radial-gradient(at 0% 80%, rgba(14, 165, 233, 0.05) 0px, transparent 50%)`,
          }}
        />
      </div>

      <div className="w-full safe-area-x py-6 sm:px-8 lg:px-12 xl:px-16">
        <nav className="safe-area-t flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:gap-4 sm:px-8 sm:py-4">
          <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-90" aria-label="QuoteMyFence home">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link href="/blog" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-600">Blog</Link>
            <Link href="/login" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Member login</Link>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 sm:py-2.5">
              Book a call
            </a>
            <Link href="/signup" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 sm:py-2.5">
              Limited-time: $199.99/mo
            </Link>
          </div>
        </nav>

        <header className="pt-12 pb-10 text-center sm:pt-24 sm:pb-12">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">
            Insights & tips
          </span>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            The <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 bg-clip-text text-transparent">QuoteMyFence</span> blog
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Tips, guides, and insights for fence contractors. Quote faster. Win more leads. Scale smarter.
          </p>
        </header>

        <Link href={`/blog/${featured.slug}`} className="group block">
          <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl sm:p-8 lg:p-12">
            <div className="relative">
              <span className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                Featured
              </span>
              <time className="mt-4 block text-sm text-slate-500" dateTime={featured.date}>
                {formatDate(featured.date)}
              </time>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-2xl text-slate-600 leading-relaxed">
                {featured.excerpt}
              </p>
              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm text-slate-500">{featured.author}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-transform group-hover:translate-x-1">
                  Read article
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </div>
          </article>
        </Link>

        {/* Posts grid */}
        <div className="mt-12 sm:mt-16">
          <h2 className="font-heading text-xl font-bold text-slate-700">More articles</h2>
          <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                <article className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg sm:p-6">
                  <time className="text-sm text-slate-500" dateTime={post.date}>
                    {formatDate(post.date)}
                  </time>
                  <h3 className="mt-3 font-heading text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                    {post.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-transform group-hover:translate-x-1">
                    Read more
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 text-center shadow-sm sm:mt-24 sm:p-8 lg:p-12">
          <p className="text-lg font-semibold text-slate-900">Ready to quote fence jobs 3x faster?</p>
          <p className="mt-2 text-slate-600">Try the demo and see the platform in action.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href={DEMO_URL} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500">
              Try the demo
            </Link>
            <Link href="/" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900">
              Back to home
            </Link>
          </div>
        </div>

        <footer className="safe-area-b mt-12 border-t border-slate-200 bg-white/80 py-8 sm:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center opacity-80 transition-opacity hover:opacity-100">
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-8 w-auto" />
            </Link>
            <div className="flex gap-6 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <Link href="/blog" className="hover:text-slate-900">Blog</Link>
              <Link href="/press" className="hover:text-slate-900">Press</Link>
              <Link href="/partners" className="hover:text-slate-900">Partners</Link>
              <Link href="/login" className="hover:text-slate-900">Log in</Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            © {new Date().getFullYear()} QuoteMyFence. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
