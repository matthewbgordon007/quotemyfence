import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeownerSearch } from './HomeownerSearch';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/8r7KjwiPTXWBCDoj9';
const DEMO_SLUG = 'demo-fence';

export const metadata: Metadata = {
  title: 'Fence estimate software for contractors | QuoteMyFence',
  description: 'Qualified fence leads, around the clock. Give your customers an instant estimate tool they love. Draw on map → Get price → Submit. Try the demo free.',
};

const stepsForContractors = [
  { title: 'Add your link', desc: 'Put your custom quote link on your website' },
  { title: 'Define your products', desc: 'Set your fence types, styles, and pricing' },
  { title: 'Collect leads', desc: 'Start getting qualified quote requests instantly' },
];

const stepsForCustomers = [
  { title: 'Find the property', desc: 'Type your address to see your yard on the map' },
  { title: 'Draw the project', desc: 'Trace your fence line with our intuitive design tool' },
  { title: 'Get an instant estimate', desc: 'Receive your project budget in seconds' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none fixed -right-40 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-[var(--accent-secondary)]/8 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Nav */}
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-11 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]">
              Member login
            </Link>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border-2 border-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
            >
              Schedule a call
            </a>
            <Link
              href="/signup"
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="mt-14 text-center sm:mt-20 lg:mt-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">QuoteMyFence</p>
          <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl lg:text-[3.25rem]">
            Qualified fence leads, around the clock.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)] sm:text-xl">
            Stop chasing unqualified leads. Give customers a buying experience they love—instant estimates, any time.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/estimate/${DEMO_SLUG}/contact`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:shadow-xl hover:-translate-y-0.5"
            >
              Try the demo
            </Link>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--line)] bg-white px-6 py-4 text-base font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
            >
              Schedule a call
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">Instant access. No signup required for the demo.</p>
        </header>

        {/* Your 24/7 salesperson */}
        <section className="mt-20 rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Your 24/7 salesperson
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[var(--muted)]">
            Using QuoteMyFence delivers qualified leads so you can know before you go. Customers draw their fence, get an instant price, and submit—day or night.
          </p>
        </section>

        {/* Easy setup for contractors */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Contractor software that&apos;s easy to set up
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[var(--muted)]">
            Start pre-qualifying leads in minutes with 3 easy steps.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {stepsForContractors.map((s, i) => (
              <div key={i} className="rounded-2xl border-2 border-[var(--line)] bg-white p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-lg font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold text-[var(--text)]">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href={`/estimate/${DEMO_SLUG}/contact`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Try it yourself
            </Link>
          </div>
        </section>

        {/* Customer experience */}
        <section className="mt-20 rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Your customers will love our estimate calculator
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[var(--muted)]">
            Create an instant project budget in 3 easy steps.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {stepsForCustomers.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-secondary)]/20 text-xl font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold text-[var(--text)]">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href={`/estimate/${DEMO_SLUG}/contact`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Try the demo
            </Link>
          </div>
        </section>

        {/* Homeowner / Contractor portals */}
        <section className="mt-20 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-lg transition hover:border-[var(--accent)]/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="mt-6 font-heading text-xl font-bold text-[var(--text)]">Contractors</h2>
            <p className="mt-2 text-[var(--muted)]">Manage products, pricing, and leads. Share your estimate link with customers.</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/signup" className="rounded-xl bg-[var(--accent)] px-5 py-3.5 text-center font-semibold text-white transition hover:opacity-90">
                Sign up
              </Link>
              <Link href="/login" className="rounded-xl border-2 border-[var(--line)] px-5 py-3 text-center font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/50">
                Log in
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-lg transition hover:border-emerald-400/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="mt-6 font-heading text-xl font-bold text-[var(--text)]">Find your contractor</h2>
            <p className="mt-2 text-[var(--muted)]">Get a fence estimate in minutes. Search for your contractor.</p>
            <div className="mt-6">
              <HomeownerSearch />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">Or try the demo to see the full flow.</p>
            <Link href={`/estimate/${DEMO_SLUG}/contact`} className="mt-2 block text-center text-sm font-semibold text-[var(--accent)] hover:underline">
              Try demo →
            </Link>
          </div>
        </section>

        {/* Schedule a call CTA */}
        <section className="mt-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 via-white to-[var(--accent-secondary)]/10 p-10 text-center sm:p-12">
          <h2 className="font-heading text-2xl font-bold text-[var(--text)] sm:text-3xl">
            Get started today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--muted)]">
            Book a call to see how QuoteMyFence can help your fence business capture more qualified leads.
          </p>
          <a
            href={SCHEDULE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:opacity-90"
          >
            Schedule a call
          </a>
        </section>

        {/* Testimonial */}
        <section className="mt-20 rounded-2xl border-2 border-[var(--line)] bg-white p-8 sm:p-10">
          <blockquote className="text-center">
            <p className="font-heading text-lg font-medium text-[var(--text)] sm:text-xl">
              &ldquo;Customers love drawing their fence on the map—no more back-and-forth for measurements. We get better leads and they get instant estimates.&rdquo;
            </p>
            <footer className="mt-4">
              <cite className="not-italic text-[var(--muted)]">— Fence contractor using QuoteMyFence</cite>
            </footer>
          </blockquote>
          <p className="mt-4 text-center text-sm font-medium text-[var(--muted)]">
            Trusted by fence contractors across Canada
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-[var(--line)] pt-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-9 w-auto opacity-80" />
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <Link href="/signup" className="text-[var(--muted)] transition hover:text-[var(--accent)]">
                Contractor sign up
              </Link>
              <Link href="/login" className="text-[var(--muted)] transition hover:text-[var(--accent)]">
                Member login
              </Link>
              <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] transition hover:text-[var(--accent)]">
                Schedule a call
              </a>
              <Link href={`/estimate/${DEMO_SLUG}/contact`} className="text-[var(--muted)] transition hover:text-[var(--accent)]">
                Try demo
              </Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">© {new Date().getFullYear()} QuoteMyFence. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
