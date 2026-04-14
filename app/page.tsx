import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoplayOnViewVideo } from '@/components/AutoplayOnViewVideo';
import { FAQAccordion } from '@/components/FAQAccordion';
import { JsonLd } from '@/components/JsonLd';
import { SiteNav } from '@/components/SiteNav';
import { TestimonialsCarousel } from '@/components/TestimonialsCarousel';
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={faqJsonLd} />
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <section id="hero" className="py-12 text-center sm:py-16">
          <p className="mx-auto inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
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
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Try live demo
            </a>
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Book a call
            </a>
          </div>
        </section>

        <section id="demo" className="scroll-mt-24 py-6 sm:py-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <AutoplayOnViewVideo src="/videos/QuoteProcess.mp4" className="w-full" />
          </div>
        </section>

        <section id="features" className="scroll-mt-24 py-12 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold">Satellite draw flow</h3>
              <p className="mt-2 text-sm text-slate-600">Homeowners draw real fence lines on their own property.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold">Branded instant estimate</h3>
              <p className="mt-2 text-sm text-slate-600">Your pricing rules and your visual identity, end to end.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold">Higher-intent leads</h3>
              <p className="mt-2 text-sm text-slate-600">You get contact info with measurements, not vague inquiries.</p>
            </div>
          </div>
        </section>

        <section id="testimonials" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-12 sm:py-14">
          <h2 className="px-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Trusted by growing fence teams
          </h2>
          <TestimonialsCarousel items={testimonials} />
        </section>

        <section id="pricing" className="scroll-mt-24 py-14 sm:py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Simple pricing. Serious results.</h2>
            <p className="mt-3 text-slate-600">Launch your quote flow for $199.99 CAD/month. Cancel anytime.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Start now
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Member login
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 py-12 sm:p-8 sm:py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-8">
            <FAQAccordion items={faqs} />
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 py-14 text-center sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Want help getting set up?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            We can walk through products, pricing, and launch best practices with your team.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Book a call
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Email us
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© <span suppressHydrationWarning>{new Date().getFullYear()}</span> QuoteMyFence</p>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-slate-900">Blog</Link>
            <Link href="/partners" className="hover:text-slate-900">Partners</Link>
            <a href="/#faq" className="hover:text-slate-900">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
