import Link from 'next/link';
import { HomeownerSearch } from './HomeownerSearch';

const features = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: 'Draw on map',
    text: 'Trace your fence line on a satellite map for accurate measurements.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Instant estimate',
    text: 'See your price range in seconds based on your contractor\'s products and pricing.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Submit & get notified',
    text: 'Send your quote request. Your contractor\'s team will reach out shortly.',
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Subtle background elements */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none fixed -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-[var(--accent)]/8 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -left-32 -z-10 h-96 w-96 rounded-full bg-[var(--accent-secondary)]/6 blur-3xl" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center rounded-xl bg-black px-3 py-2 transition-opacity hover:opacity-90">
            <img
              src="/quotemyfence-logo.png"
              alt="QuoteMyFence"
              className="h-14 w-auto sm:h-16"
            />
          </Link>
        </nav>

        <header className="mt-12 text-center sm:mt-16">
          <div className="flex justify-center">
            <img
              src="/quotemyfence-logo.png"
              alt="QuoteMyFence"
              className="h-28 w-auto sm:h-36 md:h-44"
            />
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl md:text-[2.75rem]">
            Draw your fence.
            <br />
            <span className="text-[var(--accent)]">Get your estimate.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--muted)]">
            Simple fence estimates for homeowners. Powerful tools for contractors.
          </p>
        </header>

        <div className="mt-14 grid gap-8 sm:mt-16 md:grid-cols-2 md:gap-10 lg:gap-12">
          {/* Contractor portal */}
          <div className="group rounded-2xl border border-[var(--line)] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] transition hover:shadow-md hover:border-[var(--accent)]/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-[var(--text)]">Contractors</h2>
            <p className="mt-2 text-[var(--muted)]">
              Manage products, pricing, and leads. Share your estimate link with customers.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] px-5 py-3.5 font-semibold text-white shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center rounded-xl border border-[var(--line)] px-5 py-3.5 font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Homeowner portal */}
          <div className="group rounded-2xl border border-[var(--line)] bg-white p-8 shadow-sm ring-1 ring-black/[0.03] transition hover:shadow-md hover:border-[var(--accent)]/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-[var(--text)]">Homeowners</h2>
            <p className="mt-2 text-[var(--muted)]">
              Find your contractor and get a fence estimate in minutes.
            </p>
            <div className="mt-6">
              <HomeownerSearch />
            </div>
            <p className="mt-4 text-xs text-[var(--muted)] leading-relaxed">
              Type your contractor&apos;s name (e.g. &quot;Gordon Lawn...&quot;). If they use QuoteMyFence, they&apos;ll appear. Click to start your quote.
            </p>
          </div>
        </div>

        <section className="mt-20 rounded-2xl border border-[var(--line)] bg-white/80 p-8 shadow-sm backdrop-blur-sm sm:mt-24">
          <h2 className="text-center text-lg font-bold tracking-tight text-[var(--text)] sm:text-xl">
            How it works
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-[var(--line)] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-[var(--muted)]">
              © {new Date().getFullYear()} QuoteMyFence
            </span>
            <div className="flex gap-6 text-sm">
              <Link href="/signup" className="text-[var(--muted)] transition hover:text-[var(--accent)]">
                Contractor sign up
              </Link>
              <Link href="/login" className="text-[var(--muted)] transition hover:text-[var(--accent)]">
                Log in
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
