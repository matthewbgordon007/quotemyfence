import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ProductScreenshot } from '@/components/ProductScreenshot';
import { ProductVideo } from '@/components/ProductVideo';
import { AppScreenshotCarousel } from '@/components/AppScreenshotCarousel';
import { FloatingScreenshot } from '@/components/FloatingScreenshot';
import { FadeInScreenshot } from '@/components/FadeInScreenshot';
import { RotatingScreenshots } from '@/components/RotatingScreenshots';

// Brand images
const STOCK = {
  heroFence: '/images/whitepvc-fence.png',
  fenceContractor: '/images/whitepvc-fence.png',
  propertyYard: '/images/residential-neighborhood.png',
};

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';
const CONTACT_EMAIL = 'info@quotemyfence.ca';

export const metadata: Metadata = {
  title: 'Fence estimate software for contractors | QuoteMyFence',
  description: 'Qualified fence leads, around the clock. Give your customers an instant estimate tool they love. Draw on map → Get price → Submit. Try the demo free.',
};

const stepsForContractors = [
  { title: 'Add your link', desc: 'Put your custom quote link on your website, social media, or business cards' },
  { title: 'Define your products', desc: 'Set your fence types, styles, colours, and pricing in minutes' },
  { title: 'Collect leads', desc: 'Start getting qualified quote requests 24/7—even while you sleep' },
];

const stepsForCustomers = [
  { title: 'Find the property', desc: 'Type your address to see your yard on a satellite map' },
  { title: 'Draw the project', desc: 'Trace your fence line with our intuitive drawing tool' },
  { title: 'Get an instant estimate', desc: 'Receive your project budget in seconds—no waiting' },
];

const testimonials = [
  {
    quote: 'Customers love drawing their fence on the map—no more back-and-forth for measurements. We get better leads and they get instant estimates.',
    name: 'Sarah M.',
    role: 'Fence Contractor, Ontario',
    avatar: 'S',
  },
  {
    quote: 'QuoteMyFence has been a game-changer. We close more jobs because homeowners come to us pre-qualified and ready to buy.',
    name: 'Mike T.',
    role: 'Landscape & Fence Co.',
    avatar: 'M',
  },
  {
    quote: 'The demo sold me in 5 minutes. My customers get instant prices and I get leads with real fence drawings. Win-win.',
    name: 'Jessica L.',
    role: 'Fence Pro, BC',
    avatar: 'J',
  },
];

const features = [
  { title: '24/7 lead generation', desc: 'Your estimate tool works while you sleep', bg: 'bg-blue-50', text: 'text-blue-700' },
  { title: 'Satellite map accuracy', desc: 'Customers draw on real property imagery', bg: 'bg-blue-100', text: 'text-blue-700' },
  { title: 'Instant pricing', desc: 'No more ballpark quotes—real numbers, real fast', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { title: 'Custom branding', desc: 'Your link, your products, your prices', bg: 'bg-sky-50', text: 'text-sky-700' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100">
      {/* Layered background - gradient + pattern */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50" />
        <div className="absolute inset-0 opacity-[0.4]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-300/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute right-1/3 top-1/4 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Nav */}
        <nav className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg sm:px-6">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-11 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 transition-all duration-200 hover:text-slate-900">
              Member login
            </Link>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
            >
              Book a call
            </a>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-600 hover:shadow-lg"
            >
              Start free
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="mt-16 text-center sm:mt-20 lg:mt-28">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-800">
            Fence estimate software for contractors
          </div>
          <h1 className="mt-6 font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Qualified fence leads,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
              around the clock
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Stop chasing unqualified leads. Give customers a buying experience they love—instant estimates on a real map. Available globally.
          </p>
          <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            <a
              href={DEMO_URL}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:from-blue-700 hover:to-blue-800"
            >
              Try the demo free
            </a>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-8 py-4 text-lg font-bold text-slate-800 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl"
            >
              Book a meeting
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/25 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-2xl"
            >
              Contact us
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-500">No signup required for the demo. Instant access.</p>
          <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
            <AppScreenshotCarousel className="shadow-2xl ring-1 ring-slate-200/50" />
          </div>
        </header>

        {/* Stats */}
        <section className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Contractors', value: '100+' },
            { label: 'Estimates', value: '10K+' },
            { label: 'Service', value: 'Global' },
            { label: '24/7', value: 'Lead capture' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200/60 bg-white/95 p-6 text-center shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Floating screenshot strip */}
        <section className="mt-20 flex flex-wrap items-center justify-center gap-6 py-8">
          <FloatingScreenshot src="/images/screenshots/app-02.png" alt="Contact form" delay={0} />
          <FloatingScreenshot src="/images/screenshots/app-10.png" alt="Review" delay={200} />
          <FloatingScreenshot src="/images/screenshots/app-13.png" alt="Thank you" delay={400} />
        </section>

        {/* Features - colorful grid */}
        <section className="mt-20">
          <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            Everything you need to grow
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Built for fence contractors who want more qualified leads and happier customers.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-2xl ${f.bg} p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-blue-200/60`}
              >
                <h3 className={`font-heading text-lg font-bold ${f.text}`}>{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Product preview - app screenshots with dynamic effects */}
        <section className="mt-24">
          <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            See it in action
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Real screenshots from the platform. Try the demo to experience it yourself.
          </p>
          <div className="mt-12 flex justify-center">
            <a
              href={DEMO_URL}
              className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-2xl"
            >
              Launch demo
            </a>
          </div>
          <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-12">
            <FadeInScreenshot src="/images/screenshots/app-01.png" alt="Leads dashboard" />
            <FadeInScreenshot src="/images/screenshots/app-06.png" alt="Quote calculator" className="lg:mt-12" />
            <FadeInScreenshot src="/images/screenshots/app-15.png" alt="Quote calculator with segments" />
            <FadeInScreenshot src="/images/screenshots/app-03.png" alt="Products configuration" className="lg:mt-12" />
          </div>
          <div className="mt-16">
            <h3 className="text-center font-heading text-xl font-bold text-slate-900">Platform highlights</h3>
            <RotatingScreenshots count={6} className="mt-8" />
          </div>
        </section>

        {/* How it works - contractors */}
        <section className="relative mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-xl transition-all duration-300 hover:shadow-2xl sm:p-12 lg:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative hidden min-h-[320px] overflow-visible lg:block lg:min-h-[400px]">
              <FloatingScreenshot src="/images/screenshots/app-04.png" alt="Products" className="absolute left-0 top-0 w-72 max-w-[90%]" delay={0} />
              <FloatingScreenshot src="/images/screenshots/app-07.png" alt="Design picker" className="absolute bottom-4 right-0 w-60 max-w-[85%]" delay={600} />
            </div>
            <div className="space-y-8 p-4 sm:p-6 lg:p-0">
          <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-left">
            Easy setup for contractors
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Start pre-qualifying leads in minutes.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {stepsForContractors.map((s, i) => (
              <div key={i} className="group rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-blue-200/60">
                <span className="mt-2 inline-block rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">
                  Step {i + 1}
                </span>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={DEMO_URL}
              className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
            >
              Try it yourself
            </a>
            <Link href="/signup" className="rounded-2xl border-2 border-slate-300 bg-white px-8 py-4 font-bold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg">
              Sign up free
            </Link>
          </div>
            </div>
          </div>
        </section>

        {/* Customer experience */}
        <section className="mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 to-blue-50 p-8 shadow-xl transition-all duration-300 hover:shadow-2xl sm:p-12 lg:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 space-y-8 p-4 sm:p-6 lg:order-1 lg:p-0">
          <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-left">
            Your customers will love it
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Create an instant project budget in 3 easy steps.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {stepsForCustomers.map((s, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-sky-200/60">
                <span className="mt-2 inline-block rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">
                  Step {i + 1}
                </span>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <a
              href={DEMO_URL}
              className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
            >
              Try the demo
            </a>
          </div>
            </div>
            <div className="relative order-1 flex min-h-[280px] items-center justify-center overflow-visible sm:min-h-[340px] lg:order-2 lg:min-h-[420px]">
              <FloatingScreenshot src="/images/screenshots/app-09.png" alt="Address search" className="w-56" delay={0} />
              <FloatingScreenshot src="/images/screenshots/app-14.png" alt="Map drawing" className="absolute right-4 top-1/2 w-48 -translate-y-1/2" delay={400} />
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-24">
          <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            Trusted by fence contractors
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            See what contractors are saying about QuoteMyFence.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-blue-200/60">
                <p className="text-lg font-medium text-slate-800">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-600">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contractor CTA */}
        <section className="mt-24">
          <div className="group mx-auto max-w-2xl rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-10 shadow-xl ring-1 ring-blue-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:ring-2 hover:ring-blue-300/50 sm:p-12">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Start capturing qualified leads</h2>
            <p className="mt-2 text-slate-600">Manage products, pricing, and leads. Share your custom estimate link with customers.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-blue-600 px-8 py-5 text-center text-lg font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
              >
                Sign up free
              </Link>
              <Link href="/login" className="rounded-xl border-2 border-slate-300 bg-white px-8 py-5 text-center text-lg font-bold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md">
                Log in
              </Link>
              <a
                href={DEMO_URL}
                className="rounded-xl border-2 border-blue-500 px-8 py-5 text-center text-lg font-bold text-blue-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
              >
                Try demo
              </a>
            </div>
          </div>
        </section>

        {/* Big CTA */}
        <section className="mt-24 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-12 text-center shadow-2xl transition-all duration-300 hover:shadow-[0_25px_60px_-15px_rgba(59,130,246,0.4)] sm:p-16">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Ready to capture more leads?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-blue-100">
            Book a call to see how QuoteMyFence can help your fence business grow.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-white px-10 py-4 text-lg font-bold text-blue-600 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:bg-blue-50 hover:shadow-2xl"
            >
              Book a meeting
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-2xl border-2 border-white px-10 py-4 text-lg font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/10"
            >
              Contact us
            </a>
            <a
              href={DEMO_URL}
              className="rounded-2xl border-2 border-white px-10 py-4 text-lg font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/10"
            >
              Try demo free
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 rounded-2xl bg-slate-900 px-8 py-12 text-slate-300 sm:px-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto opacity-90" />
              <p className="mt-4 max-w-xs text-sm">
                Fence estimate software for contractors. Qualified leads, 24/7. Global service.
              </p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="font-bold text-white">Product</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <Link href="/signup" className="hover:text-white">Sign up</Link>
                  <Link href="/login" className="hover:text-white">Log in</Link>
                  <a href={DEMO_URL} className="hover:text-white">Try demo</a>
                </div>
              </div>
              <div>
                <p className="font-bold text-white">Contact</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    Book a call
                  </a>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
                    Email us
                  </a>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-slate-700 pt-8 text-sm text-slate-500">
            © {new Date().getFullYear()} QuoteMyFence. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
