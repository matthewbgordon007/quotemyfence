import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tips, guides, and insights for fence contractors. Learn how to quote faster, win more leads, and grow your fence business.',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 inline-block text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Back to home
        </Link>
        <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
          Blog
        </h1>
        <p className="mt-2 text-slate-600">
          Tips, guides, and insights for fence contractors.
        </p>
        <div className="mt-12 space-y-8">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/60 hover:shadow-xl"
            >
              <time className="text-sm text-slate-500" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
              <h2 className="mt-2 font-heading text-xl font-bold text-slate-900 hover:text-blue-600">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-2 text-slate-600">{post.excerpt}</p>
              <p className="mt-4 text-sm text-slate-500">By {post.author}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
