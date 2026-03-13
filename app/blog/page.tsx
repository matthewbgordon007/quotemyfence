import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';

export const metadata: Metadata = {
  title: 'Blog | QuoteMyFence',
  description: 'Tips, guides, and insights for fence contractors. Learn how to quote faster, win more leads, and grow your fence business.',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.2) 0px, transparent 50%),
              radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
              radial-gradient(at 0% 80%, rgba(14, 165, 233, 0.1) 0px, transparent 50%)`,
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="w-full px-4 py-6 sm:px-8 lg:px-12 xl:px-16">
        {/* Nav */}
        <nav className="flex items-center justify-between border-b border-slate-700/60 bg-slate-900/80 px-4 py-4 backdrop-blur-xl sm:px-8">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-11 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/blog" className="text-sm font-semibold text-blue-400">Blog</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">Member login</Link>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500">
              Book a call
            </a>
            <Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500">
              Limited-time: $199.99/mo
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="pt-16 pb-12 text-center sm:pt-24">
          <span className="inline-block rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-400">
            Insights & tips
          </span>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            The <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">QuoteMyFence</span> blog
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Tips, guides, and insights for fence contractors. Quote faster. Win more leads. Scale smarter.
          </p>
        </header>

        {/* Featured post */}
        <Link href={`/blog/${featured.slug}`} className="group block">
          <article className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-8 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-blue-500/10 hover:shadow-2xl sm:p-10 lg:p-12">
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl transition-all group-hover:bg-blue-500/20" />
            <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-500/5 blur-2xl" />
            <div className="relative">
              <span className="inline-block rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
                Featured
              </span>
              <time className="mt-4 block text-sm text-slate-500" dateTime={featured.date}>
                {formatDate(featured.date)}
              </time>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white transition-colors group-hover:text-blue-300 sm:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-2xl text-slate-400 leading-relaxed">
                {featured.excerpt}
              </p>
              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm text-slate-500">{featured.author}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition-transform group-hover:translate-x-1">
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
        <div className="mt-16">
          <h2 className="font-heading text-xl font-bold text-slate-300">More articles</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                <article className="relative h-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-blue-500/5">
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                  <time className="text-sm text-slate-500" dateTime={post.date}>
                    {formatDate(post.date)}
                  </time>
                  <h3 className="mt-3 font-heading text-lg font-bold text-white transition-colors group-hover:text-blue-300">
                    {post.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-400 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition-transform group-hover:translate-x-1">
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

        {/* CTA */}
        <div className="mt-24 rounded-2xl border border-slate-700/60 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 p-8 text-center backdrop-blur-sm sm:p-12">
          <p className="text-lg font-semibold text-white">Ready to quote fence jobs 3x faster?</p>
          <p className="mt-2 text-slate-400">Try the demo and see the platform in action.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href={DEMO_URL} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500">
              Try the demo
            </Link>
            <Link href="/" className="rounded-xl border border-slate-600 px-6 py-3 font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-800/50 hover:text-white">
              Back to home
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-800 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center opacity-80 transition-opacity hover:opacity-100">
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-8 w-auto" />
            </Link>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-300">Home</Link>
              <Link href="/blog" className="hover:text-slate-300">Blog</Link>
              <Link href="/login" className="hover:text-slate-300">Log in</Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600">
            © {new Date().getFullYear()} QuoteMyFence. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
