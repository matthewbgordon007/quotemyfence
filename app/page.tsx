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
                Fence quote software
              </p>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.06] lg:text-6xl lg:leading-[1.05]">
                Instant fence estimates on your site—{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  more qualified leads for your crew.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 lg:mx-0 lg:max-w-xl lg:text-xl">
                Homeowners draw the fence on a satellite map, pick styles and heights, and see a real price from your
                catalog. You get contact info and linear feet so your sales team is talking to people who are already
                interested.
              </p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                <a
                  href={DEMO_URL}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500"
                >
                  Try free demo
                </a>
                <a
                  href={SCHEDULE_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-blue-300/90 bg-white/95 px-8 py-3.5 text-base font-bold text-blue-900 shadow-md transition hover:bg-blue-50"
                >
                  Book a call
                </a>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Try the demo with no signup</p>
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
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Fast setup</p>
              <p className="mt-2 text-sm text-slate-600">Three steps: add your link, load your fence styles and pricing, go live. No IT project.</p>
            </div>
            <div className="px-6 py-12 text-center sm:py-14">
              <p className="text-5xl font-black tabular-nums text-blue-600 sm:text-6xl">24/7</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Quotes while you sleep</p>
              <p className="mt-2 text-sm text-slate-600">Homeowners run fence quotes nights and weekends so your pipeline keeps filling.</p>
            </div>
            <div className="px-6 py-12 text-center sm:py-14">
              <p className="text-5xl font-black tabular-nums text-blue-600 sm:text-5xl">$199.99</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">CAD / month</p>
              <p className="mt-2 text-sm text-slate-600">Promo pricing. No long contract—cancel when you want.</p>
            </div>
          </div>
        </section>

        <section
          id="spotlight"
          className="scroll-mt-28 border-b border-slate-900/20 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 py-16 text-white sm:py-20"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300/95">Fence pros</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Turn your website into a 24/7 fence lead machine
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-100/90 sm:text-lg">
                Satellite map drawing, your fence styles and gates, your pricing—customers get an instant ballpark and
                you get name, phone, and footage so every lead is easier to close.
              </p>
              <a
                href={DEMO_URL}
                className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-blue-900 shadow-lg transition hover:bg-blue-50"
              >
                See live demo
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
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Stop chasing bad fence leads</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Skip the empty &ldquo;contact us&rdquo; forms. Homeowners show you the job on the map and see a real price
              range first—so your estimators spend time on serious fence jobs, not tire-kickers.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Try the demo
              </a>
              <a
                href={SCHEDULE_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                Talk to sales
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
              Easy setup for busy fence contractors
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Get your online fence quote tool live in three simple steps.
            </p>
            <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <li className="relative rounded-2xl border border-blue-100/80 bg-white p-8 pt-12 shadow-lg shadow-blue-900/5 ring-1 ring-slate-100">
                <span className="absolute left-8 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
                  1
                </span>
                <h3 className="text-lg font-bold text-slate-900">Add your branded link</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Put one link on your website, Facebook ads, truck wrap, or email—customers click straight into your
                  fence quote tool.
                </p>
              </li>
              <li className="relative rounded-2xl border border-blue-100/80 bg-white p-8 pt-12 shadow-lg shadow-blue-900/5 ring-1 ring-slate-100">
                <span className="absolute left-8 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
                  2
                </span>
                <h3 className="text-lg font-bold text-slate-900">Build your fence catalog &amp; pricing</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Load your vinyl, wood, chain link, gates, heights, and add-ons so every instant quote matches how you
                  bid jobs in the field.
                </p>
              </li>
              <li className="relative rounded-2xl border border-blue-100/80 bg-white p-8 pt-12 shadow-lg shadow-blue-900/5 ring-1 ring-slate-100">
                <span className="absolute left-8 top-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
                  3
                </span>
                <h3 className="text-lg font-bold text-slate-900">Go live and get leads</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Publish and start getting fence leads with drawings, contact info, and footage in your dashboard.
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
            <p className="mt-3 text-center text-sm text-slate-500">No signup required</p>
          </div>
        </section>

        <section id="homeowner" className="scroll-mt-28 border-b border-slate-900/10 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Customers love the instant fence quote
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Three easy steps: find the yard, draw the fence line, get a price range before they ever call you.
            </p>
            <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <li className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md ring-1 ring-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">Enter their address</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  They type in the property address and land on a clear satellite view of their lot.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md ring-1 ring-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">Draw the fence</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  They click and drag to trace where the fence goes—front yard, backyard, gates, the whole job.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md ring-1 ring-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">See the price</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  They get an instant fence estimate from your pricing so they know roughly what the job costs.
                </p>
              </li>
            </ol>
            <div className="mt-12 flex flex-col items-center gap-3">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Try the customer demo
              </a>
              <p className="text-sm text-slate-500">No signup required</p>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">Video</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Watch how the fence quote works</h2>
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
              Close more fence jobs with <span className="text-blue-300">better leads</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-blue-100/95">
              When homeowners already drew the job and saw a price, your sales calls start hot—less back-and-forth, more
              booked site visits and sold jobs.
            </p>
            <a
              href={DEMO_URL}
              className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-400 hover:to-indigo-400"
            >
              Try the demo again
            </a>
            <p className="mt-3 text-sm text-blue-200/80">No signup required</p>
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
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">Dashboard</p>
            <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Real screenshots from the fence contractor dashboard
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Manage leads, quotes, and your fence catalog in one place. These are actual screens from the app—not fake
              mockups.
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
              <h3 className="text-center text-lg font-bold text-slate-900 sm:text-xl">More screens from the product</h3>
              <RotatingScreenshots count={6} className="mt-6 justify-center sm:mt-8" />
            </div>

            <div className="mt-10 flex justify-center">
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Open the demo
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
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800/80">Why fence companies use it</p>
            <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Built for real fence sales—not generic software
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
              The features that matter for fence quotes, leads, and follow-up. Nothing extra.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Satellite fence drawing</h3>
                <p className="mt-2 text-sm text-slate-600">Homeowners draw right on the map so you get real footage and layout.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Your brand, your prices</h3>
                <p className="mt-2 text-sm text-slate-600">Your logo, colors, and fence pricing—customers see your company, not ours.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Hotter fence leads</h3>
                <p className="mt-2 text-sm text-slate-600">Name, phone, email, and what they drew—so you quote faster and win more jobs.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="get-started" className="scroll-mt-28 border-b border-slate-900/10 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Get started in three steps</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
              From signup to live fence quotes—most contractors move fast.
            </p>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              <li className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg">
                  1
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">Get set up fast</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  We help you load your fence styles, gates, heights, and pricing so your first quotes look right.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg">
                  2
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">Put the link on your website</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Add the quote button to your homepage, ads, or email—one link for every homeowner lead.
                </p>
              </li>
              <li className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg">
                  3
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">Start winning fence jobs</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Leads roll in with drawings and measurements so your team can quote and close faster.
                </p>
              </li>
            </ol>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Sign up now
              </Link>
              <a
                href={DEMO_URL}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-10 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                Try demo first
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
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800/80">Testimonials</p>
              <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                What fence contractors say
              </h2>
              <p className="text-center text-3xl font-extrabold tracking-tight text-blue-600 sm:text-4xl">about QuoteMyFence</p>
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
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Simple monthly pricing</h2>
            <p className="mt-4 text-lg text-slate-600">
              $199.99 CAD per month for the full fence quote tool and dashboard. Promo pricing—cancel anytime.
            </p>
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
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100/90">Contact</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Questions? Want help getting started?</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-blue-100/95">
              Book a call or email us—we&apos;re happy to walk through fence products, pricing, and how to get more leads
              from your website.
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
