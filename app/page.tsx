import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoplayOnViewVideo } from '@/components/AutoplayOnViewVideo';
import { FAQAccordion } from '@/components/FAQAccordion';
import { JsonLd } from '@/components/JsonLd';
import { SiteNav } from '@/components/SiteNav';
import { FloatingScreenshot } from '@/components/FloatingScreenshot';
import { FadeInScreenshot } from '@/components/FadeInScreenshot';
import { RotatingScreenshots } from '@/components/RotatingScreenshots';
import { TestimonialsCarousel } from '@/components/TestimonialsCarousel';
import { DesktopCTARail } from '@/components/DesktopCTARail';
import { StickyMobileCTA } from '@/components/StickyMobileCTA';
import { SITE_URL, canonical, SEO_DEFAULTS } from '@/lib/seo';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';
const CONTACT_EMAIL = 'info@quotemyfence.ca';

const HOME_SECTION_KEYWORDS = [
  'fence estimate software',
  'instant fence quote calculator',
  'satellite fence mapping tool',
  'fence lead generation software',
];

export const metadata: Metadata = {
  title: 'Fence Estimate Software for Contractors | QuoteMyFence',
  description:
    'Turn website visitors into qualified fence leads with instant estimates, satellite drawing, and branded quote flow.',
  keywords: [...SEO_DEFAULTS.keywords, ...HOME_SECTION_KEYWORDS],
  openGraph: {
    ...SEO_DEFAULTS.openGraph,
    url: canonical('/'),
    title: 'QuoteMyFence | Fence Estimate Software for Contractors',
    description: SEO_DEFAULTS.description,
  },
  twitter: SEO_DEFAULTS.twitter,
  alternates: { canonical: canonical('/') },
};

const testimonials = [
  {
    quote:
      'Customers love drawing their fence on the map. We get cleaner leads and close jobs faster.',
    name: 'Gordon Landscaping',
    role: 'Contractor',
    avatar: 'G',
  },
  {
    quote:
      'QuoteMyFence has removed the back-and-forth. Most leads come in ready to buy.',
    name: 'Cura Construction',
    role: 'Contractor',
    avatar: 'C',
  },
  {
    quote:
      'Simple setup, strong branding, and way better lead quality than our old quote form.',
    name: 'Canadian Fence Material Supply',
    role: 'Supplier',
    avatar: 'C',
  },
];

const faqs = [
  {
    question: 'How does QuoteMyFence work?',
    answer:
      'Homeowners enter their address, draw fence lines on satellite imagery, and get an instant estimate. You control products, pricing, and branding, and receive qualified leads with measurements.',
  },
  {
    question: 'Can I use my own branding and pricing?',
    answer:
      'Yes. Your logo, your link, your products, your prices. The experience is fully branded for your company.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Current promotional pricing is $199.99 CAD/month. It includes lead capture, quote flow, product/pricing setup, and dashboard access.',
  },
  {
    question: 'Is setup difficult?',
    answer:
      'No. Most contractors can publish their first quote page quickly, and onboarding help is available if needed.',
  },
];

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SEO_DEFAULTS.organization.name,
  url: SEO_DEFAULTS.organization.url,
  logo: SEO_DEFAULTS.organization.logo,
  description: SEO_DEFAULTS.organization.description,
  email: SEO_DEFAULTS.organization.email,
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SEO_DEFAULTS.siteName,
  url: SITE_URL,
  description: SEO_DEFAULTS.description,
  publisher: { '@id': `${SITE_URL}/#organization` },
};

export default function HomePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  /** Bottom edge tone for each section — next section starts with this at 0% for a seamless handoff */
  const seam = {
    hero: '#e2e8f0',
    stats: '#ffffff',
    demo: '#f1f5f9',
    dashboard: '#f8fafc',
    features: '#eef2ff',
    testimonials: '#e2e8f0',
    pricing: '#f4f4f5',
    /** Matches FAQ section bottom stop so contact picks up the same tone */
    faq: '#e4e4e7',
  } as const;

  return (
    <div className="relative min-h-screen bg-slate-200/90 text-slate-900">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={faqJsonLd} />
      <SiteNav />

      <main id="main-content" className="relative z-10 w-full pb-20 pt-24 sm:pb-24 sm:pt-28">
        <section
          id="hero"
          className="scroll-mt-28 border-b border-slate-900/10"
          style={{
            background: `
              linear-gradient(to bottom, transparent 52%, rgba(226,232,240,0.5) 82%, ${seam.hero} 100%),
              linear-gradient(125deg,
                rgb(252 253 255) 0%,
                rgb(248 250 252) 28%,
                rgb(191 219 254) 48%,
                rgb(59 130 246) 72%,
                rgb(30 58 138) 90%,
                rgb(15 23 42) 100%
              )
            `,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
            <div className="mx-auto max-w-4xl text-center lg:mx-0 lg:max-w-3xl lg:text-left">
              <p className="inline-flex rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-800 shadow-sm">
                Fence contractor software
              </p>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.06] lg:text-6xl lg:leading-[1.05]">
                Qualified fence leads,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  delivered to your inbox.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 lg:mx-0 lg:max-w-xl lg:text-xl">
                Stop chasing tire-kickers. Give homeowners a branded, self-serve estimate they can run anytime—so your
                team talks to buyers who already know their budget.
              </p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                <a
                  href={DEMO_URL}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500"
                >
                  Try the demo — free
                </a>
                <a
                  href={SCHEDULE_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-blue-300/90 bg-white/95 px-8 py-3.5 text-base font-bold text-blue-900 shadow-md transition hover:bg-blue-50"
                >
                  Schedule a call
                </a>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Instant demo link · No signup required</p>
            </div>
          </div>
        </section>

        <section
          id="stats"
          className="scroll-mt-28 border-b border-slate-200/80"
          style={{
            background: `linear-gradient(180deg, ${seam.hero} 0%, ${seam.stats} 28%)`,
          }}
        >
          <div className="mx-auto grid max-w-6xl divide-y divide-slate-200/90 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-6 py-12 text-center sm:py-14">
              <p className="text-5xl font-black tabular-nums text-blue-600 sm:text-6xl">3</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Steps to publish</p>
              <p className="mt-2 text-sm text-slate-600">Link, catalog, and live quotes—without a long IT project.</p>
            </div>
            <div className="px-6 py-12 text-center sm:py-14">
              <p className="text-5xl font-black tabular-nums text-blue-600 sm:text-6xl">24/7</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Your quote desk</p>
              <p className="mt-2 text-sm text-slate-600">Homeowners run estimates on their schedule, not only business hours.</p>
            </div>
            <div className="px-6 py-12 text-center sm:py-14">
              <p className="text-5xl font-black tabular-nums text-blue-600 sm:text-5xl">$199.99</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">CAD / month</p>
              <p className="mt-2 text-sm text-slate-600">Promotional pricing. Cancel anytime.</p>
            </div>
          </div>
        </section>

        <section
          id="spotlight"
          className="scroll-mt-28 border-b border-slate-900/20 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 py-16 text-white sm:py-20"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300/95">Industry-leading</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Fence estimate software built for contractors
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-100/90 sm:text-lg">
                Satellite drawing, your products, your prices—and leads that show up with measurements and intent.
              </p>
              <a
                href={DEMO_URL}
                className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-blue-900 shadow-lg transition hover:bg-blue-50"
              >
                More info — try the demo
              </a>
            </div>
            <div className="flex justify-center lg:justify-end">
              <FloatingScreenshot
                src="/images/screenshots/app-10.png"
                alt="Quote review in QuoteMyFence"
                delay={0}
                className="w-full max-w-[min(100%,320px)] drop-shadow-[0_28px_60px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
        </section>

        <section id="pitch" className="scroll-mt-28 border-b border-slate-900/10 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Your always-on salesperson</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Replace vague &ldquo;contact us&rdquo; forms with a guided flow that qualifies budget before your team picks up
              the phone—so you can <span className="font-semibold text-slate-800">know before you go.</span>
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Free demo
              </a>
              <a
                href={SCHEDULE_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                Schedule a call
              </a>
            </div>
          </div>
        </section>

        <section
          id="setup"
          className="scroll-mt-28 border-b border-slate-900/10 bg-gradient-to-b from-blue-50/90 via-white to-white py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Finally, fence software that&apos;s easy to set up
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Start publishing qualified experiences in three straightforward steps.
            </p>
            <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <li className="relative rounded-2xl border border-blue-100/80 bg-white p-8 pt-12 shadow-lg shadow-blue-900/5 ring-1 ring-slate-100">
                <span className="absolute left-8 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
                  1
                </span>
                <h3 className="text-lg font-bold text-slate-900">Add your branded link</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Drop a single link on your homepage, campaigns, or QR codes—customers land in your quote flow.
                </p>
              </li>
              <li className="relative rounded-2xl border border-blue-100/80 bg-white p-8 pt-12 shadow-lg shadow-blue-900/5 ring-1 ring-slate-100">
                <span className="absolute left-8 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
                  2
                </span>
                <h3 className="text-lg font-bold text-slate-900">Define products &amp; pricing</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Configure styles, heights, gates, and rules so every instant estimate matches how you actually sell.
                </p>
              </li>
              <li className="relative rounded-2xl border border-blue-100/80 bg-white p-8 pt-12 shadow-lg shadow-blue-900/5 ring-1 ring-slate-100">
                <span className="absolute left-8 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
                  3
                </span>
                <h3 className="text-lg font-bold text-slate-900">Publish &amp; collect leads</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Go live and watch homeowner-drawn layouts arrive with contact details and measurements in your inbox.
                </p>
              </li>
            </ol>
            <div className="mt-12 flex justify-center">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
              >
                Try it yourself
              </a>
            </div>
            <p className="mt-3 text-center text-sm text-slate-500">Instant access · No signup required</p>
          </div>
        </section>

        <section id="homeowner" className="scroll-mt-28 border-b border-slate-900/10 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Your customers will love the experience
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Three quick steps to an instant fence budget—clear, visual, and on their timeline.
            </p>
            <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <li className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md ring-1 ring-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">Find the property</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  They enter an address and jump straight to high-resolution satellite context.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md ring-1 ring-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">Draw the fence</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  An intuitive draw tool lets them trace lines on their own lot—not guess from photos.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md ring-1 ring-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">Get the estimate</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Pricing rules fire instantly so both sides receive a budget-ready summary for follow-up.
                </p>
              </li>
            </ol>
            <div className="mt-12 flex flex-col items-center gap-3">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Try the demo
              </a>
              <p className="text-sm text-slate-500">Instant access · No signup required</p>
            </div>
          </div>
        </section>

        <section
          id="demo"
          className="scroll-mt-28 border-b border-slate-900/10 py-8 sm:py-12"
          style={{
            background: `
              linear-gradient(180deg, #f8fafc 0%, rgb(203 213 225) 22%, rgb(226 232 240) 48%, rgb(241 245 249) 100%)
            `,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 lg:px-8">
            <div className="overflow-hidden border-[6px] border-blue-700 bg-white shadow-[0_28px_70px_-24px_rgba(30,64,175,0.45)] sm:border-8 sm:rounded-sm">
              <div className="px-4 pb-5 pt-10 text-center sm:px-6 sm:pt-12">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">See the flow in motion</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Watch the quote journey</h2>
              </div>
              <div className="border-t border-slate-200/90 bg-slate-950/[0.04]">
                <AutoplayOnViewVideo src="/videos/QuoteProcess.mp4" className="w-full" />
              </div>
            </div>
          </div>
        </section>

        <section id="value-prop" className="scroll-mt-28 border-b border-slate-900/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 py-16 text-white sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Make fence sales easier with <span className="text-blue-300">qualified</span> leads
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-blue-100/95">
              When homeowners see an instant estimate on their own property, your sales conversations start one step ahead—
              with budget clarity and measurements already on the page.
            </p>
            <a
              href={DEMO_URL}
              className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-400 hover:to-indigo-400"
            >
              Try the demo
            </a>
            <p className="mt-3 text-sm text-blue-200/80">Instant access · No signup required</p>
          </div>
        </section>

        <section
          id="dashboard"
          className="scroll-mt-28 border-b border-slate-900/10"
          style={{
            background: `
              linear-gradient(180deg, ${seam.demo} 0%, rgba(255, 255, 255, 0) 16%),
              radial-gradient(120% 90% at 100% -10%, rgba(59, 130, 246, 0.14), transparent 52%),
              radial-gradient(90% 70% at 0% 100%, rgba(99, 102, 241, 0.1), transparent 55%),
              linear-gradient(180deg, rgb(255 255 255) 0%, rgb(255 255 255) 62%, ${seam.dashboard} 100%)
            `,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">Inside the platform</p>
            <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Insights your team can actually use
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Filter leads, review quotes, tune products—the same workspace you run daily. Screens below are real
              product views, not mockups.
            </p>

            <div className="mt-10 flex w-full flex-wrap items-center justify-center gap-6 px-1 sm:gap-8">
              <FloatingScreenshot
                src="/images/screenshots/app-02.png"
                alt="Customer contact step in quote flow"
                delay={0}
                className="w-full max-w-[min(100%,300px)] sm:max-w-[280px]"
              />
              <FloatingScreenshot
                src="/images/screenshots/app-10.png"
                alt="Quote review screen"
                delay={200}
                className="w-full max-w-[min(100%,300px)] sm:max-w-[280px]"
              />
              <FloatingScreenshot
                src="/images/screenshots/app-13.png"
                alt="Thank you and next steps"
                delay={400}
                className="w-full max-w-[min(100%,300px)] sm:max-w-[280px]"
              />
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 sm:gap-10 lg:gap-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100">
                <FadeInScreenshot src="/images/screenshots/app-01.png" alt="Leads dashboard" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100 sm:mt-0 lg:mt-10">
                <FadeInScreenshot src="/images/screenshots/app-06.png" alt="Quote calculator" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100 lg:mt-0">
                <FadeInScreenshot src="/images/screenshots/app-15.png" alt="Quote calculator with fence segments" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100 lg:mt-10">
                <FadeInScreenshot src="/images/screenshots/app-03.png" alt="Products and catalog configuration" />
              </div>
            </div>

            <div className="mt-12 border-t border-slate-200/80 pt-10">
              <h3 className="text-center text-lg font-bold text-slate-900 sm:text-xl">More of the platform—at a glance</h3>
              <RotatingScreenshots count={6} className="mt-6 justify-center sm:mt-8" />
            </div>

            <div className="mt-10 flex justify-center">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Try the live demo
              </a>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-28 border-b border-slate-900/10"
          style={{
            background: `
              linear-gradient(180deg, ${seam.dashboard} 0%, rgba(255, 255, 255, 0.92) 14%, transparent 32%),
              linear-gradient(158deg, rgb(255 255 255) 0%, rgb(239 246 255) 40%, rgb(238 242 255) 100%)
            `,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800/80">Why teams switch</p>
            <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Built for real fence sales
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
              The essentials contractors asked for—without the bloat.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Satellite draw flow</h3>
                <p className="mt-2 text-sm text-slate-600">Homeowners draw real fence lines on their own property.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Branded instant estimate</h3>
                <p className="mt-2 text-sm text-slate-600">Your pricing rules and your visual identity, end to end.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Higher-intent leads</h3>
                <p className="mt-2 text-sm text-slate-600">You get contact info with measurements, not vague inquiries.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="get-started" className="scroll-mt-28 border-b border-slate-900/10 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Get started today</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
              From first login to live link—most teams move fast with a simple checklist.
            </p>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              <li className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg">
                  1
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">Personalized setup</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Walk through products, pricing, and branding so your first publish matches how you sell.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg">
                  2
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">Add your link everywhere</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Place your quote URL on the homepage, ads, trucks, or follow-up emails—one entry point for every lead.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg">
                  3
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">Collect qualified leads</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Watch homeowner-drawn layouts arrive with contact info and measurements ready for your sales team.
                </p>
              </li>
            </ol>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Start now
              </Link>
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-10 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                Try the demo first
              </a>
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          className="scroll-mt-28 border-b border-slate-900/10 py-10 sm:py-14"
          style={{
            background: `linear-gradient(180deg, ${seam.features} 0%, rgb(241 245 249) 26%, rgb(226 232 240) 100%)`,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 lg:px-8">
            <div className="border-4 border-blue-900/85 bg-gradient-to-b from-white via-white to-slate-50/95 px-4 py-12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] sm:px-8 sm:py-14">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800/80">Happy customers</p>
              <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Kind words from
              </h2>
              <p className="text-center text-3xl font-extrabold tracking-tight text-blue-600 sm:text-4xl">awesome teams</p>
              <TestimonialsCarousel items={testimonials} />
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-28 border-b border-slate-900/10"
          style={{
            background: `
              linear-gradient(180deg, ${seam.testimonials} 0%, rgba(255, 255, 255, 0) 20%),
              radial-gradient(ellipse 90% 60% at 50% 0%, rgba(37, 99, 235, 0.12), transparent 62%),
              linear-gradient(180deg, rgb(255 255 255) 0%, rgb(250 250 250) 85%, ${seam.pricing} 100%)
            `,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-16 lg:px-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">Pricing</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Simple pricing. Serious results.</h2>
            <p className="mt-4 text-lg text-slate-600">Launch your quote flow for $199.99 CAD/month. Cancel anytime.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Start now
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                Member login
              </Link>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-28 border-b border-slate-900/10"
          style={{
            background: `linear-gradient(180deg, ${seam.pricing} 0%, rgb(244 244 245) 36%, ${seam.faq} 100%)`,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
            <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-8">
              <FAQAccordion items={faqs} />
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="scroll-mt-28 border-b border-slate-900/20 pb-4"
          style={{
            background: `
              linear-gradient(180deg, ${seam.faq} 0%, rgb(59 130 246) 26%, rgb(29 78 216) 52%, rgb(67 56 202) 78%, rgb(15 23 42) 100%)
            `,
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-16 lg:px-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100/90">Next step</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Want help getting set up?</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-blue-100/95">
              We can walk through products, pricing, and launch best practices with your team.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={SCHEDULE_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-800 shadow-lg transition hover:bg-blue-50"
              >
                Book a call
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Email us
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 w-full border-t border-blue-900/30 bg-slate-950/50 py-10 text-blue-100/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© <span suppressHydrationWarning>{new Date().getFullYear()}</span> QuoteMyFence</p>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="transition hover:text-white">
              Blog
            </Link>
            <Link href="/partners" className="transition hover:text-white">
              Partners
            </Link>
            <a href="/#faq" className="transition hover:text-white">
              FAQ
            </a>
          </div>
        </div>
      </footer>
      <DesktopCTARail />
      <StickyMobileCTA />
    </div>
  );
}
