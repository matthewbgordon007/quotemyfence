import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical, SEO_DEFAULTS } from '@/lib/seo';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const CONTACT_EMAIL = 'info@quotemyfence.ca';

export const metadata: Metadata = {
  title: 'Press & Media | QuoteMyFence',
  description:
    'QuoteMyFence in the press. Media kit, logos, and facts. Contact us for interviews, quotes, or partnership opportunities.',
  openGraph: {
    ...SEO_DEFAULTS.openGraph,
    url: canonical('/press'),
    title: 'Press & Media | QuoteMyFence',
    description: 'Media kit, logos, and contact for journalists and partners.',
  },
  alternates: { canonical: canonical('/press') },
};

export default function PressPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.2) 0px, transparent 50%),
              radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="w-full safe-area-x py-6 sm:px-8 lg:px-12 xl:px-16">
        <nav className="safe-area-t flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-900/80 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
          <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-90" aria-label="QuoteMyFence home">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link href="/blog" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:text-white">Blog</Link>
            <Link href="/partners" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-400">Partners</Link>
            <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:text-white">Member login</Link>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
              Book a call
            </a>
            <Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
              Sign up
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-3xl pt-12 pb-16 sm:pt-24">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Press & <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">media</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Logos, facts, and contact for journalists, bloggers, and partners. We’re happy to provide quotes, interviews, or assets for coverage.
          </p>

          <section className="mt-12 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 backdrop-blur-sm sm:p-8">
            <h2 className="font-heading text-xl font-bold text-white">About QuoteMyFence</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              QuoteMyFence is the #1 fence estimate software for contractors in Canada. Homeowners draw their fence on a satellite map and get an instant estimate; contractors set their products and pricing and capture pre-qualified leads 24/7. We help fence contractors turn tire-kickers into ready-to-buy leads with instant quotes, satellite-precise mapping, and white-label branding.
            </p>
            <ul className="mt-6 space-y-2 text-slate-400">
              <li><strong className="text-slate-300">Founded:</strong> 2024</li>
              <li><strong className="text-slate-300">Headquarters:</strong> Canada</li>
              <li><strong className="text-slate-300">Product:</strong> SaaS fence estimate & lead capture for contractors</li>
              <li><strong className="text-slate-300">Pricing:</strong> From $199.99 CAD/month (promotional)</li>
            </ul>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 backdrop-blur-sm sm:p-8">
            <h2 className="font-heading text-xl font-bold text-white">Media kit & logos</h2>
            <p className="mt-4 text-slate-400">
              Logo and branding assets are available on request. Please email us with your publication or project and we’ll send high-res files and usage guidelines.
            </p>
            <p className="mt-4">
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence logo" className="h-16 w-auto rounded-lg bg-white/10 p-2" />
            </p>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 backdrop-blur-sm sm:p-8">
            <h2 className="font-heading text-xl font-bold text-white">For media inquiries</h2>
            <p className="mt-4 text-slate-400">
              Interviews, quotes, or partnership opportunities:
            </p>
            <p className="mt-4">
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-400 hover:text-blue-300">{CONTACT_EMAIL}</a>
            </p>
            <p className="mt-4">
              <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
                Book a call
              </a>
            </p>
          </section>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link href="/" className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:bg-slate-800/50 hover:text-white">
              Back to home
            </Link>
            <Link href="/partners" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500">
              Partners & link to us
            </Link>
          </div>
        </main>

        <footer className="safe-area-b mt-12 border-t border-slate-800 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center opacity-80 hover:opacity-100">
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-8 w-auto" />
            </Link>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-300">Home</Link>
              <Link href="/blog" className="hover:text-slate-300">Blog</Link>
              <Link href="/press" className="hover:text-slate-300">Press</Link>
              <Link href="/partners" className="hover:text-slate-300">Partners</Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600">© {new Date().getFullYear()} QuoteMyFence. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
