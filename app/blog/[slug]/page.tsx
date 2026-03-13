import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts } from '@/lib/blog-posts';

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
  return {
    title: post.title,
    description: post.excerpt,
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

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/blog" className="mb-8 inline-block text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Back to blog
        </Link>
        <article className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-lg">
          <time className="text-sm text-slate-500" dateTime={post.date}>
            {formatDate(post.date)}
          </time>
          <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-slate-600">By {post.author}</p>
          <div className="prose prose-slate mt-8 max-w-none">
            {paragraphs.map((p, i) => {
              if (p.startsWith('**') && p.endsWith('**')) {
                return (
                  <h3 key={i} className="mt-6 font-heading text-lg font-bold text-slate-900">
                    {p.replace(/\*\*/g, '')}
                  </h3>
                );
              }
              if (p.startsWith('- ')) {
                const items = p.split('\n').filter((l) => l.startsWith('- '));
                return (
                  <ul key={i} className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
                    {items.map((item, j) => (
                      <li key={j}>{item.replace(/^- /, '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="mt-4 text-slate-700 leading-relaxed">
                  {p}
                </p>
              );
            })}
          </div>
        </article>
        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            View all posts
          </Link>
        </div>
      </div>
    </div>
  );
}
