import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoplayOnViewVideo } from '@/components/AutoplayOnViewVideo';
import { QuoteProcessVideo } from '@/components/QuoteProcessVideo';
import { FAQAccordion } from '@/components/FAQAccordion';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';
const CONTACT_EMAIL = 'info@quotemyfence.ca';

export const metadata: Metadata = {
  title: 'Fence estimate software for contractors | QuoteMyFence',
  description: 'The #1 fence estimate software. Turn tire-kickers into ready-to-buy leads. Instant quotes, satellite mapping, 24/7 lead capture. Try free.',
};

const stepsForContractors = [
  { title: 'Add your link', desc: 'Embed your branded quote link anywhere—website, social, Google, business cards. One link, endless leads.' },
  { title: 'Define your products', desc: 'Set types, styles, colours & pricing in minutes. Turn-key setup—no IT required.' },
  { title: 'Collect pre-qualified leads', desc: '24/7 lead engine. Homeowners come ready with measurements & budgets. Close faster.' },
];

const stepsForCustomers = [
  { title: 'Find the property', desc: 'Satellite-precise mapping—customers see their yard in seconds. Zero guesswork.' },
  { title: 'Draw the project', desc: 'Intuitive, point-and-click simplicity. Fence lines, gates, extensions—done.' },
  { title: 'Get an instant estimate', desc: 'Real numbers, real fast. No callbacks. No ballpark quotes. Just clarity.' },
];

const testimonials = [
  {
    quote: 'Customers love drawing their fence on the map—no more back-and-forth for measurements. We get better leads and they get instant estimates.',
    name: 'Gordon Landscaping',
    role: 'Contractor',
    avatar: 'G',
  },
  {
    quote: 'QuoteMyFence has been a game-changer. We close more jobs because homeowners come to us pre-qualified and ready to buy.',
    name: 'Cura Construction',
    role: 'Contractor',
    avatar: 'C',
  },
  {
    quote: 'The demo sold me in 5 minutes. My customers get instant prices and I get leads with real fence drawings. Win-win.',
    name: 'Canadian Fence Material Supply',
    role: 'Supplier',
    avatar: 'C',
  },
];

const faqs = [
  {
    question: 'How does QuoteMyFence work?',
    answer: 'QuoteMyFence lets homeowners enter their address, draw their fence line on a satellite map, and get an instant estimate. As a contractor, you set your products, styles, colours, and pricing. Customers use your branded link, and you receive pre-qualified leads with real measurements—no more back-and-forth.',
  },
  {
    question: 'How much does QuoteMyFence cost?',
    answer: 'Special promotional pricing is $199.99 CAD per month. That includes your custom quote link, full product and pricing control, lead management dashboard, and 24/7 capture. No hidden fees. Cancel anytime.',
  },
  {
    question: 'Do customers need to sign up to get a quote?',
    answer: 'No. Homeowners can try the demo and get an instant estimate without creating an account. For your custom contractor link, you control whether customers need to submit contact info—most choose to collect it so you can follow up on leads.',
  },
  {
    question: 'Is the satellite map accurate for measurements?',
    answer: 'Yes. We use high-resolution satellite imagery so customers draw directly on their property. The measurements are calculated from real geographic data, giving you reliable lengths for fence quotes—far more accurate than phone estimates or rough sketches.',
  },
  {
    question: 'Can I use my own branding and pricing?',
    answer: 'Absolutely. QuoteMyFence is fully white-label. Your link, your logo, your products, your prices. You define fence types (PVC, WPC, etc.), styles, colours, and per-foot or per-segment pricing. Customers see your brand—not ours.',
  },
  {
    question: 'What if I need help setting up?',
    answer: 'We offer onboarding support and can walk you through product setup, pricing rules, and best practices. Book a call or email us—we want you winning more jobs.',
  },
];

const features = [
  { title: '24/7 lead machine', desc: 'Capture hot leads around the clock—even while you sleep. Set it and forget it.', bg: 'bg-blue-50', text: 'text-blue-700' },
  { title: 'Satellite-precise mapping', desc: 'Cut the site-visit guesswork. Customers draw on real imagery—measurements that close.', bg: 'bg-blue-100', text: 'text-blue-700' },
  { title: 'Instant, accurate pricing', desc: 'No ballparks. No callbacks. Real numbers that build trust and speed decisions.', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { title: 'White-label your brand', desc: 'Your link. Your products. Your prices. 100% customizable—look like the pros.', bg: 'bg-sky-50', text: 'text-sky-700' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Fixed vertical Blog tab - right edge */}
      <Link
        href="/blog"
        className="fixed right-0 top-1/2 z-50 flex w-12 -translate-y-1/2 rotate-90 origin-center items-center justify-center rounded-bl-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700"
      >
        Blog
      </Link>

      {/* ========== HERO - Dark full-width ========== */}
      <section className="relative bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Nav */}
          <nav className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/90 px-4 py-3 backdrop-blur-sm sm:px-6">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-11 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/blog" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">
              Blog
            </Link>
            <Link href="/login" className="text-sm font-semibold text-slate-300 transition-colors hover:text-white">
              Member login
            </Link>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
            >
              Book a call
            </a>
            <Link
              href="/signup"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
            >
              Limited-time: $199.99/mo
            </Link>
          </div>
          </nav>

          {/* Hero - split layout */}
          <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div>
              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Qualified leads, around the clock, delivered straight to your inbox
              </h1>
              <p className="mt-6 text-lg text-slate-300">
                Stop chasing unqualified leads. Give your customers a buying experience they&apos;ll love, accessible any time. QuoteMyFence pre-qualifies customers so you know before you go.
              </p>
              <a
                href={DEMO_URL}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-blue-500"
              >
                TRY THE DEMO FOR FREE
              </a>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-500/50 shadow-2xl">
                <AutoplayOnViewVideo src="/videos/QuoteProcess.mp4" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS BANNER - Dark with dashed divider ========== */}
      <section className="bg-slate-900">
        <hr className="section-divider" />
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="font-heading text-4xl font-extrabold text-blue-400 sm:text-5xl">10K+</p>
          <p className="mt-2 text-xl font-bold text-white">Quotes generated</p>
          <p className="mt-1 text-sm text-slate-400">Thousands of leads qualified through our instant estimate tool</p>
        </div>
      </section>

      {/* ========== CUSTOMER STEPS - White, two-column ========== */}
      <section className="bg-white">
        <hr className="section-divider" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            Your customers will love our project estimate calculator
          </h2>
          <p className="mt-2 text-lg text-blue-600">Create an instant project budget in 3 easy steps</p>
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              {stepsForCustomers.map((s, i) => (
                <div key={i} className="flex gap-4 rounded-2xl border-2 border-dashed border-blue-400/60 bg-white p-6 shadow-md">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-blue-500 text-lg font-bold text-blue-600">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading font-bold text-slate-900">{s.title}:</h3>
                    <p className="mt-1 text-slate-600">{s.desc}</p>
                  </div>
                </div>
              ))}
              <a href={DEMO_URL} className="inline-block rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:bg-blue-700">
                Try the demo
              </a>
            </div>
            <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-400/60 shadow-xl">
              <img src="/images/screenshots/app-01.png" alt="Leads dashboard" className="w-full" />
            </div>
          </div>
        </div>
      </section>

        {/* ========== HOW IT WORKS - Contractor steps ========== */}
        <section className="relative bg-slate-100">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Launch in minutes. Scale forever.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              The easiest way to start capturing and converting fence leads. No learning curve. No tech headaches.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-12">
              {stepsForContractors.map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-blue-500 bg-blue-600 text-xl font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="mt-4 font-heading font-bold text-slate-900">{s.title}</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex justify-center">
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-10 py-4 font-bold text-white transition-all hover:bg-blue-700">
                TRY FREE DEMO
              </a>
            </div>
          </div>
        </section>

        {/* ========== Features - two-column with dashed borders ========== */}
        <section className="bg-slate-50">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Finally, contractor software that&apos;s easy to setup and custom to your business
            </h2>
            <p className="mt-2 text-slate-600">Start pre-qualifying your leads in minutes with 3 easy steps.</p>
            <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start">
              <div className="space-y-6">
                {features.map((f) => (
                  <div key={f.title} className={`rounded-2xl ${f.bg} border-2 border-dashed border-blue-400/50 p-6`}>
                    <h3 className={`font-heading font-bold ${f.text}`}>{f.title}</h3>
                    <p className="mt-2 text-slate-600">{f.desc}</p>
                  </div>
                ))}
                <a href={DEMO_URL} className="inline-block rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:bg-blue-700">
                  Try the demo
                </a>
              </div>
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-400/60 shadow-xl">
                <img src="/images/screenshots/app-06.png" alt="Quote calculator" className="w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ========== Product preview ========== */}
        <section className="bg-white">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              See the magic in action
            </h2>
            <p className="mt-2 text-slate-600">
              Real screenshots from the platform that&apos;s winning over contractors. Experience it yourself—no strings attached.
            </p>
            <div className="mt-8">
              <a href={DEMO_URL} className="inline-block rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:bg-blue-700">
                Launch live demo
              </a>
            </div>
            <div className="mt-16 grid gap-12 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-400/60">
                <img src="/images/screenshots/app-15.png" alt="Quote calculator with segments" className="w-full" />
              </div>
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-400/60">
                <img src="/images/screenshots/app-03.png" alt="Products configuration" className="w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Quote calculator */}
        <section className="bg-slate-50">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            The quote calculator that closes deals
          </h2>
          <p className="mt-3 text-slate-600">
            Turn incoming requests into polished, professional quotes—in seconds. Your pricing, your rules, zero hassle.
          </p>
          <div className="mx-auto mt-12 flex justify-center">
            <QuoteProcessVideo
              src="/videos/Contractor123.mp4"
              steps={[
                { title: '1. Set your product price', desc: 'Define types, styles, colours & pricing in minutes. Your catalog, your rules.' },
                { title: '2. Make your quote', desc: 'One-click conversion. Turn lead requests into polished, professional quotes.' },
                { title: '3. Make your fence layout', desc: 'Map-precise drawings. Customers sketch it—you deliver with confidence.' },
              ]}
              className="w-full max-w-5xl"
            />
          </div>
          </div>
        </section>

        {/* Testimonials + Social proof */}
        <section className="bg-white">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            Join over 100+ contractors who save time with QuoteMyFence
          </h2>
          <p className="mx-auto mt-2 text-center text-slate-600">
            Pre-qualified leads, delivered. See why industry pros are making the switch.
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
          </div>
        </section>

        {/* Contractor CTA */}
        <section className="bg-slate-50">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="group mx-auto max-w-2xl rounded-3xl border-2 border-dashed border-blue-400/60 bg-white p-10 shadow-xl transition-all hover:shadow-2xl sm:p-12">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Ready to 10x your fence lead flow?</h2>
            <p className="mt-2 text-slate-600">Join the contractors who&apos;ve ditched the quote chaos. One platform. One link. Endless qualified leads.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-blue-600 px-8 py-5 text-center text-lg font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
              >
                Limited-time: $199.99/mo
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
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white" id="faq">
          <hr className="section-divider" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-slate-600">
            Everything you need to know about QuoteMyFence.
          </p>
          <div className="mt-12">
            <FAQAccordion items={faqs} />
          </div>
          </div>
        </section>

        {/* Big CTA */}
        <section className="mx-4 mb-4 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-12 text-center shadow-2xl sm:mx-6 sm:p-16 lg:mx-8">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Your fence business deserves more than guesswork
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-blue-100">
            See the platform in action. Discover how contractors are closing more deals with less effort. Your future leads are waiting.
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
        <footer className="mx-auto mb-8 max-w-6xl rounded-2xl bg-slate-900 px-8 py-12 text-slate-300 sm:mx-6 sm:px-12 lg:mx-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto opacity-90" />
              <p className="mt-4 max-w-xs text-sm">
                The fence industry&apos;s go-to for instant estimates & qualified leads. Scale smarter. 24/7. Global.
              </p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="font-bold text-white">Product</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <Link href="/signup" className="hover:text-white">Sign up</Link>
                  <Link href="/login" className="hover:text-white">Log in</Link>
                  <Link href="/blog" className="hover:text-white">Blog</Link>
                  <a href={DEMO_URL} className="hover:text-white">Try demo</a>
                  <a href="/#faq" className="hover:text-white">FAQ</a>
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
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> QuoteMyFence. All rights reserved.
          </p>
        </footer>
    </div>
  );
}
