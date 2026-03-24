import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts } from '@/lib/blog-posts';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL, canonical, SEO_DEFAULTS } from '@/lib/seo';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: 'Post not found' };
  const url = canonical(`/blog/${slug}`);
  return {
    title: `${post.title} | QuoteMyFence Blog`,
    description: post.excerpt,
    keywords: [
      'fence contractor tips',
      'fence estimate software',
      'fence lead generation',
      ...post.title.toLowerCase().split(' ').filter((w) => w.length > 4).slice(0, 4),
    ],
    openGraph: {
      ...SEO_DEFAULTS.openGraph,
      type: 'article',
      url,
      title: `${post.title} | QuoteMyFence Blog`,
      description: post.excerpt,
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author],
      siteName: SEO_DEFAULTS.openGraph.siteName,
      section: 'Fence Contractor Insights',
      tags: ['fence quoting', 'fence leads', 'contractor software'],
    },
    twitter: {
      ...SEO_DEFAULTS.twitter,
      title: post.title,
      description: post.excerpt,
    },
    alternates: { canonical: url },
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const paragraphs = post.content.split('\n\n').filter(Boolean);
  const postUrl = canonical(`/blog/${slug}`);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: postUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: canonical('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(at 30% 20%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
              radial-gradient(at 70% 80%, rgba(14, 165, 233, 0.05) 0px, transparent 50%)`,
          }}
        />
      </div>

      <div className="w-full safe-area-x py-6 sm:px-8 lg:px-12 xl:px-16">
        <nav className="safe-area-t flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-11 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/blog" className="text-sm font-semibold text-blue-600">Blog</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Member login</Link>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500">
              Book a call
            </a>
            <Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500">
              $199.99/mo
            </Link>
          </div>
        </nav>

        {/* Back link */}
        <Link
          href="/blog"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to blog
        </Link>

        <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:mt-12 sm:p-8 lg:p-12">
          <div className="border-l-4 border-blue-500 pl-6">
            <time className="text-sm font-medium text-slate-500" dateTime={post.date}>
              {formatDate(post.date)}
            </time>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-slate-600">By {post.author}</p>
          </div>

          <div className="mt-10 space-y-6 text-slate-700">
            {paragraphs.map((p, i) => {
              if (p.startsWith('**') && p.endsWith('**')) {
                return (
                  <h3 key={i} className="font-heading text-xl font-bold text-slate-900">
                    {p.replace(/\*\*/g, '')}
                  </h3>
                );
              }
              if (p.startsWith('- ')) {
                const items = p.split('\n').filter((l) => l.startsWith('- '));
                return (
                  <ul key={i} className="space-y-2 pl-6">
                    {items.map((item, j) => (
                      <li key={j} className="relative before:absolute before:-left-4 before:content-['•'] before:text-blue-500">
                        {item.replace(/^- /, '')}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="leading-relaxed text-slate-700">
                  {p}
                </p>
              );
            })}
          </div>
        </article>

        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:mt-12 sm:flex-row sm:justify-center sm:gap-6 sm:p-8">
          <Link href="/blog" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900">
            View all posts
          </Link>
          <Link href={DEMO_URL} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500">
            Try the demo
          </Link>
          <Link href="/" className="rounded-xl px-6 py-3 font-semibold text-slate-600 transition-colors hover:text-slate-900">
            Back to home
          </Link>
        </div>

        <footer className="safe-area-b mt-12 border-t border-slate-200 bg-white/80 py-8 sm:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center opacity-80 transition-opacity hover:opacity-100">
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-8 w-auto" />
            </Link>
            <div className="flex gap-6 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <Link href="/blog" className="hover:text-slate-900">Blog</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
