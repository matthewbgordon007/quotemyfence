import Link from 'next/link';
import { HomeownerSearch } from './HomeownerSearch';

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: 'Draw on map',
    text: 'Trace your fence line on a satellite map for accurate measurements.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Instant estimate',
    text: 'See your price range in seconds based on your contractor\'s products and pricing.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Submit & get notified',
    text: 'Send your quote request. Your contractor\'s team will reach out shortly.',
  },
];

function HeroIllustration() {
  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <div className="relative rounded-2xl border-2 border-[var(--line)] bg-white p-4 shadow-xl ring-4 ring-[var(--accent)]/10">
        {/* Browser-style top bar */}
        <div className="mb-3 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        {/* Simplified map grid with fence line */}
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
          <svg viewBox="0 0 120 90" className="h-full w-full" fill="none">
            {/* Grid lines (map feel) */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={`h${i}`} x1={0} y1={i * 18} x2={120} y2={i * 18} stroke="#cbd5e1" strokeWidth={0.5} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={90} stroke="#cbd5e1" strokeWidth={0.5} />
            ))}
            {/* Fence line (user-drawn style) */}
            <path
              d="M25 70 Q45 55 65 50 Q85 45 95 30"
              stroke="var(--accent)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M25 70 Q45 55 65 50 Q85 45 95 30"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="4 4"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none fixed -right-40 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-[var(--accent)]/12 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-[var(--accent-secondary)]/10 blur-3xl" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-12 w-auto sm:h-14" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)] sm:block">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Contractor sign up
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="mt-12 text-center sm:mt-16 lg:mt-20">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl lg:text-[3.5rem]">
            Draw your fence.
            <br />
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              Get your estimate.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--muted)] sm:text-xl">
            Simple fence estimates for homeowners. Powerful tools for contractors.
          </p>
          <div className="mt-10">
            <HeroIllustration />
          </div>
        </header>

        {/* Portal cards */}
        <div className="mt-16 grid gap-6 sm:mt-20 md:grid-cols-2 md:gap-8">
          <div className="group rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-lg transition hover:border-[var(--accent)]/40 hover:shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-secondary)]/15 text-[var(--accent)]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="mt-6 font-heading text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
              Contractors
            </h2>
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
                className="flex items-center justify-center rounded-xl border-2 border-[var(--line)] px-5 py-3 font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5"
              >
                Log in
              </Link>
            </div>
          </div>

          <div className="group rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-lg transition hover:border-emerald-400/50 hover:shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="mt-6 font-heading text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
              Homeowners
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Find your contractor and get a fence estimate in minutes.
            </p>
            <div className="mt-6">
              <HomeownerSearch />
            </div>
            <p className="mt-4 text-xs text-[var(--muted)] leading-relaxed">
              Type your contractor&apos;s name (e.g. &quot;Gordon Lawn...&quot;). If they use QuoteMyFence, they&apos;ll appear.
            </p>
          </div>
        </div>

        {/* Social proof */}
        <section className="mt-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/5 via-white to-[var(--accent-secondary)]/5 p-8 sm:p-10">
          <blockquote className="text-center">
            <p className="font-heading text-lg font-medium text-[var(--text)] sm:text-xl">
              &ldquo;Customers love drawing their fence on the map—no more back-and-forth for measurements. We get better leads and they get instant estimates.&rdquo;
            </p>
            <footer className="mt-4">
              <cite className="not-italic text-[var(--muted)]">
                — Fence contractor using QuoteMyFence
              </cite>
            </footer>
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium text-[var(--muted)]">
            Trusted by fence contractors across Canada
          </p>
        </section>

        {/* How it works */}
        <section className="mt-20 rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-[var(--text)]">{f.title}</h3>
                <p className="mt-1.5 text-[var(--muted)]">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-[var(--line)] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} QuoteMyFence</span>
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
