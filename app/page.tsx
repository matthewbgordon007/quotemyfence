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

  return (
    <div className="relative min-h-screen bg-slate-200/90 text-slate-900">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={faqJsonLd} />
      <SiteNav />

      <main id="main-content" className="relative z-10 w-full pb-20 pt-24 sm:pb-24 sm:pt-28">
        <section
          id="hero"
          className="scroll-mt-28 border-b border-slate-900/15 bg-[linear-gradient(122deg,rgb(252_253_255)_0%,rgb(248_250_252)_34%,rgb(219_234_254)_52%,rgb(59_130_246)_74%,rgb(30_58_138)_92%,rgb(15_23_42)_100%)]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 text-center sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
            <div className="mx-auto max-w-4xl pb-12 sm:pb-14">
              <p className="mx-auto inline-flex rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-800 shadow-sm">
                Built for fence contractors
              </p>
              <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Instant fence estimates. <span className="text-blue-600">Qualified leads.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
                A clean, branded quote experience that helps homeowners self-serve and helps your team close faster.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={DEMO_URL}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
                >
                  Try live demo
                </a>
                <a
                  href={SCHEDULE_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border-2 border-blue-200/90 bg-white px-6 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-50/90"
                >
                  Book a call
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="scroll-mt-28 border-b border-slate-900/10 bg-slate-300/40 py-8 sm:py-12">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 lg:px-8">
            <div className="overflow-hidden border-[6px] border-blue-700 bg-white shadow-[0_28px_70px_-24px_rgba(30,64,175,0.45)] sm:border-8 sm:rounded-sm">
              <div className="px-4 pb-5 pt-10 text-center sm:px-6 sm:pt-12">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">See it in action</p>
              </div>
              <div className="border-t border-slate-200/90 bg-slate-950/[0.04]">
                <AutoplayOnViewVideo src="/videos/QuoteProcess.mp4" className="w-full" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="dashboard"
          className="scroll-mt-28 border-b border-slate-200/90 bg-white bg-[radial-gradient(120%_90%_at_100%_-10%,rgba(59,130,246,0.14),transparent_52%),radial-gradient(90%_70%_at_0%_110%,rgba(99,102,241,0.1),transparent_55%)]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">Inside the app</p>
            <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Real dashboard screenshots
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Leads, quotes, products—the same workspace your team uses every day. These are actual views from the
              platform (not mockups).
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
          className="scroll-mt-28 border-b border-slate-900/10 bg-[linear-gradient(158deg,rgb(255_255_255)_0%,rgb(239_246_255)_42%,rgb(238_242_255)_100%)]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800/80">Why teams switch</p>
            <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Built for real fence sales</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Satellite draw flow</h3>
                <p className="mt-2 text-sm text-slate-600">Homeowners draw real fence lines on their own property.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Branded instant estimate</h3>
                <p className="mt-2 text-sm text-slate-600">Your pricing rules and your visual identity, end to end.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <h3 className="text-base font-semibold text-slate-900">Higher-intent leads</h3>
                <p className="mt-2 text-sm text-slate-600">You get contact info with measurements, not vague inquiries.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="scroll-mt-28 border-b border-slate-900/10 bg-slate-200/70 py-10 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 lg:px-8">
            <div className="border-4 border-blue-900/85 bg-gradient-to-b from-white via-white to-slate-50/95 px-4 py-12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] sm:px-8 sm:py-14">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800/80">Social proof</p>
              <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Trusted by growing fence teams
              </h2>
              <TestimonialsCarousel items={testimonials} />
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-28 border-b border-slate-200/90 bg-white bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(37,99,235,0.12),transparent_65%),linear-gradient(180deg,rgba(239,246,255,0.5)_0%,transparent_35%)]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-16 lg:px-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-900/70">Pricing</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Simple pricing. Serious results.</h2>
            <p className="mt-3 text-slate-600">Launch your quote flow for $199.99 CAD/month. Cancel anytime.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
              >
                Start now
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                Member login
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 border-b border-slate-300/80 bg-zinc-100">
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
          className="scroll-mt-28 border-b border-slate-900/20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 pb-4"
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
