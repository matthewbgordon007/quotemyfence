import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoplayOnViewVideo } from '@/components/AutoplayOnViewVideo';
import { QuoteProcessVideo } from '@/components/QuoteProcessVideo';
import { FAQAccordion } from '@/components/FAQAccordion';
import { FloatingScreenshot } from '@/components/FloatingScreenshot';
import { FadeInScreenshot } from '@/components/FadeInScreenshot';
import { RotatingScreenshots } from '@/components/RotatingScreenshots';

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
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100">
      {/* Dynamic background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50" />
        <div className="absolute inset-0 opacity-[0.4]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full animate-blob bg-blue-300/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full animate-blob animation-delay-2000 bg-indigo-300/20 blur-3xl" />
        <div className="absolute right-1/3 top-1/4 h-80 w-80 rounded-full animate-blob animation-delay-4000 bg-sky-300/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Nav */}
        <nav className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-md backdrop-blur-sm sm:px-6">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-11 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/blog" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Blog</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Member login</Link>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700">
              Book a call
            </a>
            <Link href="/signup" className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-600">
              Limited-time: $199.99/mo
            </Link>
          </div>
        </nav>

        {/* Hero - centered, original style */}
        <section className="mt-16 text-center sm:mt-20 lg:mt-28">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-800">
            The #1 fence estimate software—trusted industry-wide
          </div>
          <h1 className="mt-6 font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Turn tire-kickers into{' '}
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
              ready-to-buy leads
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
            The game-changer you&apos;ve been waiting for. Cut the back-and-forth—let homeowners get instant, accurate estimates on satellite maps. <strong>Pre-qualified leads 24/7.</strong> Scale your fence business without the grind.
          </p>
          <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            <a href={DEMO_URL} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:from-blue-700 hover:to-blue-800">
              Try the demo free—see the magic
            </a>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-8 py-4 text-lg font-bold text-slate-800 shadow-lg transition-all hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl">
              Book a meeting
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-1 hover:bg-blue-700">
              Contact us
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-500">No credit card. No commitment. See why contractors are switching—in 60 seconds.</p>
          <div className="mx-auto mt-12 flex justify-center px-2 sm:mt-16">
            <AutoplayOnViewVideo src="/videos/QuoteProcess.mp4" className="w-full max-w-6xl" />
          </div>
        </section>

        {/* Customer steps - A buying experience that sells for you */}
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              A buying experience that sells for you
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              From curiosity to commitment in 3 seamless steps. Customers love the wow factor—you&apos;ll love the qualified leads.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {stepsForCustomers.map((s, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="font-heading text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl">
                Try the demo
              </a>
            </div>
          </div>
        </section>

        {/* Quote calculator */}
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              The quote calculator that closes deals
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
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

        {/* Stats */}
        <section className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Contractors growing', value: '100+' },
            { label: 'Quotes generated', value: '10K+' },
            { label: 'Service area', value: 'Global' },
            { label: '24/7', value: 'Lead engine' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200/60 bg-white/95 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Floating screenshot strip */}
        <section className="mt-20 flex flex-wrap items-center justify-center gap-6 rounded-2xl bg-white/60 py-8 backdrop-blur-sm">
          <hr className="section-divider w-full" />
          <div className="flex w-full flex-wrap items-center justify-center gap-6 px-4">
            <FloatingScreenshot src="/images/screenshots/app-02.png" alt="Contact form" delay={0} />
            <FloatingScreenshot src="/images/screenshots/app-10.png" alt="Review" delay={200} />
            <FloatingScreenshot src="/images/screenshots/app-13.png" alt="Thank you" delay={400} />
          </div>
        </section>

        {/* Features - Built to scale */}
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Built to scale. Designed to convert.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              The all-in-one powerhouse that streamlines your entire quote-to-close pipeline. Stop leaving money on the table.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className={`rounded-2xl ${f.bg} p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-blue-200/60`}>
                  <h3 className={`font-heading text-lg font-bold ${f.text}`}>{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product preview - See the magic in action */}
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              See the magic in action
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Real screenshots from the platform that&apos;s winning over contractors. Experience it yourself—no strings attached.
            </p>
            <div className="mt-12 flex justify-center">
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-2xl">
                Launch live demo
              </a>
            </div>
            <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-12">
              <FadeInScreenshot src="/images/screenshots/app-01.png" alt="Leads dashboard" />
              <FadeInScreenshot src="/images/screenshots/app-06.png" alt="Quote calculator" className="lg:mt-12" />
              <FadeInScreenshot src="/images/screenshots/app-15.png" alt="Quote calculator with segments" />
              <FadeInScreenshot src="/images/screenshots/app-03.png" alt="Products configuration" className="lg:mt-12" />
            </div>
            <div className="mt-16">
              <h3 className="text-center font-heading text-xl font-bold text-slate-900">The full platform—at a glance</h3>
              <RotatingScreenshots count={6} className="mt-8" />
            </div>
          </div>
        </section>

        {/* How it works - contractors */}
        <section className="relative mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Launch in minutes. Scale forever.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              The easiest way to start capturing and converting fence leads. No learning curve. No tech headaches. Just results.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
              {stepsForContractors.map((s, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="font-heading text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-7 py-3.5 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl">
                Try it yourself
              </a>
              <Link href="/signup" className="rounded-2xl border-2 border-slate-300 bg-white px-7 py-3.5 font-bold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg">
                Limited-time: $199.99/mo
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Loved by contractors &amp; suppliers nationwide
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Don&apos;t just take our word for it—see why industry pros are making the switch.
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:ring-blue-200/60">
                  <p className="text-lg font-medium text-slate-800">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">{t.avatar}</div>
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
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <div className="group mx-auto max-w-2xl rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-10 shadow-xl ring-1 ring-blue-100/50 transition-all hover:-translate-y-2 hover:shadow-2xl hover:ring-2 hover:ring-blue-300/50 sm:p-12">
              <h2 className="font-heading text-2xl font-bold text-slate-900">Ready to 10x your fence lead flow?</h2>
              <p className="mt-2 text-slate-600">Join the contractors who&apos;ve ditched the quote chaos. One platform. One link. Endless qualified leads.</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4">
                <Link href="/signup" className="rounded-xl bg-blue-600 px-8 py-5 text-center text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl">
                  Limited-time: $199.99/mo
                </Link>
                <Link href="/login" className="rounded-xl border-2 border-slate-300 bg-white px-8 py-5 text-center text-lg font-bold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md">
                  Log in
                </Link>
                <a href={DEMO_URL} className="rounded-xl border-2 border-blue-500 px-8 py-5 text-center text-lg font-bold text-blue-600 transition-all hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md">
                  Try demo
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20 rounded-2xl bg-white/80 py-16 shadow-sm backdrop-blur-sm" id="faq">
          <hr className="section-divider mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Everything you need to know about QuoteMyFence.
            </p>
            <div className="mt-12">
              <FAQAccordion items={faqs} />
            </div>
          </div>
        </section>

        {/* Big CTA */}
        <section className="mt-20 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-12 text-center shadow-2xl transition-all hover:shadow-[0_25px_60px_-15px_rgba(59,130,246,0.4)] sm:p-16">
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
        <footer className="mt-20 rounded-2xl bg-slate-900 px-8 py-12 text-slate-300 sm:px-12">
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
    </div>
  );
}
