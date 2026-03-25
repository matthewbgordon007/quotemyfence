import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoplayOnViewVideo } from '@/components/AutoplayOnViewVideo';
import { QuoteProcessVideo } from '@/components/QuoteProcessVideo';
import { FAQAccordion } from '@/components/FAQAccordion';
import { FloatingScreenshot } from '@/components/FloatingScreenshot';
import { FadeInScreenshot } from '@/components/FadeInScreenshot';
import { RotatingScreenshots } from '@/components/RotatingScreenshots';
import { JsonLd } from '@/components/JsonLd';
import { DemoVideoTitle } from '@/components/DemoVideoTitle';
import { SiteNav } from '@/components/SiteNav';
import { TrustBar } from '@/components/TrustBar';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ScrollReveal } from '@/components/ScrollReveal';
import { LogoMarquee } from '@/components/LogoMarquee';
import { ComparisonBlock } from '@/components/ComparisonBlock';
import { BackToTop } from '@/components/BackToTop';
import { ROICalculator } from '@/components/ROICalculator';
import { LiveActivityTicker } from '@/components/LiveActivityTicker';
import { StickyMobileCTA } from '@/components/StickyMobileCTA';
import { ScrollProgress } from '@/components/ScrollProgress';
import { CinematicCursor } from '@/components/CinematicCursor';
import { TestimonialsCarousel } from '@/components/TestimonialsCarousel';
import { CaseStudyStrip } from '@/components/CaseStudyStrip';
import { DesktopCTARail } from '@/components/DesktopCTARail';
import { TiltCard } from '@/components/TiltCard';
import { SITE_URL, canonical, SEO_DEFAULTS } from '@/lib/seo';

const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';
const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';
const CONTACT_EMAIL = 'info@quotemyfence.ca';

const HOME_SECTION_KEYWORDS = [
  'fence estimate demo video',
  'instant fence quote calculator',
  'fence quote ROI calculator',
  'fence contractor software features',
  'satellite fence mapping tool',
  'fence lead generation pricing',
  'QuoteMyFence how it works',
  'fence estimate software FAQ',
  'fence company lead capture Canada',
  'homeowner fence drawing tool',
];

export const metadata: Metadata = {
  title: 'Fence Estimate Software for Contractors | Instant Quotes & Lead Capture | QuoteMyFence',
  description:
    'The #1 fence estimate software. Turn tire-kickers into ready-to-buy leads. Instant quotes, satellite mapping, 24/7 lead capture. Trusted by fence contractors across Canada. Try free.',
  keywords: [...SEO_DEFAULTS.keywords, ...HOME_SECTION_KEYWORDS],
  openGraph: {
    ...SEO_DEFAULTS.openGraph,
    url: canonical('/'),
    title: 'QuoteMyFence | #1 Fence Estimate Software for Contractors | Instant Quotes & Lead Capture',
    description: SEO_DEFAULTS.description,
  },
  twitter: SEO_DEFAULTS.twitter,
  alternates: { canonical: canonical('/') },
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
  {
    question: 'Does QuoteMyFence work for Canadian fence companies?',
    answer: 'Yes. QuoteMyFence is built for fence contractors across Canada. Pricing is in CAD, and your customers get a fast, professional experience whether they are in Ontario, the Maritimes, or anywhere you serve.',
  },
  {
    question: 'What types of fence can I quote with QuoteMyFence?',
    answer: 'You define your catalog—PVC, composite, wood-look, privacy, picket, and more. Set heights, colours, styles, and per-foot or segment pricing so every estimate matches how you actually build and sell.',
  },
];

const features = [
  { title: '24/7 lead machine', desc: 'Capture hot leads around the clock—even while you sleep. Set it and forget it.', bg: 'bg-blue-50', text: 'text-blue-700' },
  { title: 'Satellite-precise mapping', desc: 'Cut the site-visit guesswork. Customers draw on real imagery—measurements that close.', bg: 'bg-blue-100', text: 'text-blue-700' },
  { title: 'Instant, accurate pricing', desc: 'No ballparks. No callbacks. Real numbers that build trust and speed decisions.', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { title: 'White-label your brand', desc: 'Your link. Your products. Your prices. 100% customizable—look like the pros.', bg: 'bg-sky-50', text: 'text-sky-700' },
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
  foundingDate: SEO_DEFAULTS.organization.foundingDate,
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

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  name: SEO_DEFAULTS.title,
  url: SITE_URL,
  description: SEO_DEFAULTS.description,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#organization` },
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'QuoteMyFence',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: SEO_DEFAULTS.description,
  url: SITE_URL,
  author: { '@id': `${SITE_URL}/#organization` },
  offers: {
    '@type': 'Offer',
    price: '199.99',
    priceCurrency: 'CAD',
    priceValidUntil: '2026-12-31',
    availability: 'https://schema.org/InStock',
  },
};

const homeFeaturesItemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'QuoteMyFence platform features',
  itemListElement: features.map((f, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: f.title,
    description: f.desc,
  })),
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
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100">
      <ScrollProgress />
      <CinematicCursor />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={webPageJsonLd} />
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={homeFeaturesItemListJsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* Background - soft gradient with blue streaks */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              radial-gradient(at 20% 30%, rgba(59, 130, 246, 0.15) 0px, transparent 45%),
              radial-gradient(at 80% 20%, rgba(99, 102, 241, 0.12) 0px, transparent 45%),
              radial-gradient(at 0% 70%, rgba(14, 165, 233, 0.1) 0px, transparent 45%),
              radial-gradient(at 60% 80%, rgba(37, 99, 235, 0.08) 0px, transparent 40%),
              linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.04) 25%, transparent 50%),
              linear-gradient(225deg, transparent 0%, rgba(99, 102, 241, 0.05) 25%, transparent 50%)
            `,
          }}
        />
        {/* Subtle blue streak accent */}
        <div
          className="absolute left-0 top-0 h-[500px] w-full opacity-40"
          style={{
            background: `linear-gradient(105deg, transparent 15%, rgba(59, 130, 246, 0.07) 35%, rgba(99, 102, 241, 0.05) 55%, transparent 75%)`,
          }}
        />
      </div>

      <SiteNav />

      <div className="w-full safe-area-x pt-[73px] sm:pt-[77px] pb-6 sm:px-8 lg:px-12 xl:px-16">
        <main id="main-content">
        {/* Hero - more breathing room on mobile */}
        <section id="hero" className="scroll-mt-24 pt-12 text-center sm:pt-24 lg:pt-28" aria-labelledby="hero-heading">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">
            The #1 fence estimate software—trusted industry-wide
          </span>
          <h1 id="hero-heading" className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl">
            Turn tire-kickers into{' '}
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 bg-clip-text text-transparent">
              ready-to-buy leads
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl px-1 text-base text-slate-600 sm:mt-6 sm:px-0 sm:text-lg sm:text-xl">
            The game-changer you&apos;ve been waiting for. Cut the back-and-forth—let homeowners get instant, accurate estimates on satellite maps. <strong className="text-slate-700">Pre-qualified leads 24/7.</strong> Scale your fence business without the grind.
          </p>
          <div className="mt-8 flex flex-col flex-wrap items-center justify-center gap-4 sm:mt-10 sm:flex-row">
            <a href={DEMO_URL} className="inline-flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-blue-500 sm:w-auto sm:max-w-none sm:px-8 sm:text-lg">
              Try the demo free—see the magic
            </a>
            <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-bold text-slate-800 transition-all hover:-translate-y-1 hover:border-slate-400 hover:bg-slate-50 sm:w-auto sm:max-w-none sm:px-8 sm:text-lg">
              Book a meeting
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-blue-500 sm:w-auto sm:max-w-none sm:px-8 sm:text-lg">
              Contact us
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500 sm:mt-5">No credit card. No commitment. See why contractors are switching—in 60 seconds.</p>
          <TrustBar />
          <LiveActivityTicker />

          <div id="demo" className="mx-auto mt-10 scroll-mt-24 flex flex-col items-center justify-center px-1 sm:mt-16 sm:px-2">
            <DemoVideoTitle />
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 w-full max-w-6xl">
              <AutoplayOnViewVideo src="/videos/QuoteProcess.mp4" className="w-full max-w-6xl" />
            </div>
          </div>
        </section>

        {/* Customer steps */}
        <ScrollReveal>
        <section id="customer-experience" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
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
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-500">
                Try the demo
              </a>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* Old way vs new way comparison */}
        <ScrollReveal delay={100}>
          <section id="comparison" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
            <div className="px-5 sm:px-6 lg:px-8">
              <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Stop guessing. Start closing.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
                See the difference between the old way and the QuoteMyFence way.
              </p>
              <div className="mt-10">
                <ComparisonBlock />
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Quote calculator */}
        <ScrollReveal>
        <section id="quote-calculator" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
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
        </ScrollReveal>

        {/* Logo marquee - who uses us */}
        <ScrollReveal>
          <section id="customers" className="mt-12 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 sm:mt-20">
            <p className="pt-6 text-center text-sm font-medium text-slate-500">Trusted by fence professionals across Canada</p>
            <LogoMarquee />
          </section>
        </ScrollReveal>

        {/* Stats */}
        <ScrollReveal>
          <section id="stats" className="mt-12 scroll-mt-24 grid grid-cols-2 gap-3 sm:mt-20 sm:gap-4 sm:grid-cols-4">
            <TiltCard className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-blue-200 sm:p-6">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <AnimatedCounter value={100} suffix="+" />
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">Contractors growing</p>
            </TiltCard>
            <TiltCard className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-blue-200 sm:p-6">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                <AnimatedCounter value={10} suffix="K+" />
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">Quotes generated</p>
            </TiltCard>
            <TiltCard className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-blue-200 sm:p-6">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Global</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Service area</p>
            </TiltCard>
            <TiltCard className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-blue-200 sm:p-6">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">24/7</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Lead engine</p>
            </TiltCard>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <ROICalculator />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <CaseStudyStrip />
        </ScrollReveal>

        {/* Floating screenshot strip */}
        <ScrollReveal delay={100}>
        <section id="screenshots" className="mt-12 scroll-mt-24 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white py-6 shadow-sm sm:mt-20 sm:gap-6 sm:py-8">
          <div className="flex w-full flex-wrap items-center justify-center gap-4 px-5 sm:gap-6 sm:px-4">
            <FloatingScreenshot src="/images/screenshots/app-02.png" alt="Contact form" delay={0} />
            <FloatingScreenshot src="/images/screenshots/app-10.png" alt="Review" delay={200} />
            <FloatingScreenshot src="/images/screenshots/app-13.png" alt="Thank you" delay={400} />
          </div>
        </section>
        </ScrollReveal>

        {/* Features */}
        <ScrollReveal>
        <section id="features" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Built to scale. Designed to convert.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              The all-in-one powerhouse that streamlines your entire quote-to-close pipeline. Stop leaving money on the table.
            </p>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-1 hover:border-blue-200 sm:p-6">
                  <h3 className="font-heading text-lg font-bold text-blue-600">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* Product preview */}
        <ScrollReveal delay={100}>
        <section id="platform" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              See the magic in action
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Real screenshots from the platform that&apos;s winning over contractors. Experience it yourself—no strings attached.
            </p>
            <div className="mt-12 flex justify-center">
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-500">
                Launch live demo
              </a>
            </div>
            <div className="mt-10 grid gap-10 sm:mt-16 sm:gap-16 lg:grid-cols-2 lg:gap-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <FadeInScreenshot src="/images/screenshots/app-01.png" alt="Leads dashboard" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:mt-12">
                <FadeInScreenshot src="/images/screenshots/app-06.png" alt="Quote calculator" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <FadeInScreenshot src="/images/screenshots/app-15.png" alt="Quote calculator with segments" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:mt-12">
                <FadeInScreenshot src="/images/screenshots/app-03.png" alt="Products configuration" />
              </div>
            </div>
            <div className="mt-10 sm:mt-16">
              <h3 className="text-center font-heading text-xl font-bold text-slate-900">The full platform—at a glance</h3>
              <RotatingScreenshots count={6} className="mt-6 sm:mt-8" />
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* How it works - contractors */}
        <ScrollReveal>
        <section id="how-it-works" className="relative mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Launch in minutes. Scale forever.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              The easiest way to start capturing and converting fence leads. No learning curve. No tech headaches. Just results.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-3 lg:gap-12">
              {stepsForContractors.map((s, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="font-heading text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <a href={DEMO_URL} className="rounded-2xl bg-blue-600 px-7 py-3.5 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-500">
                Try it yourself
              </a>
              <Link href="/signup" className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 font-bold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50">
                Limited-time: $199.99/mo
              </Link>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* Testimonials */}
        <ScrollReveal delay={100}>
        <section id="testimonials" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Loved by contractors &amp; suppliers nationwide
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Don&apos;t just take our word for it—see why industry pros are making the switch.
            </p>
            <TestimonialsCarousel items={testimonials} />
          </div>
        </section>
        </ScrollReveal>

        {/* Contractor CTA */}
        <section id="pricing" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 py-10 shadow-sm sm:mt-20 sm:py-16">
          <div className="px-5 sm:px-6 lg:px-8">
            <div className="group mx-auto max-w-2xl rounded-3xl border border-blue-200 bg-white p-6 transition-all hover:border-blue-300 sm:p-10 lg:p-12">
              <h2 className="font-heading text-2xl font-bold text-slate-900">Ready to 10x your fence lead flow?</h2>
              <p className="mt-2 text-slate-600">Join the contractors who&apos;ve ditched the quote chaos. One platform. One link. Endless qualified leads.</p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
                <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-blue-600 px-6 py-4 text-center text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-500 sm:px-8 sm:py-5 sm:text-lg">
                  Limited-time: $199.99/mo
                </Link>
                <Link href="/login" className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-center text-base font-bold text-slate-800 transition-all hover:-translate-y-0.5 hover:bg-slate-50 sm:px-8 sm:py-5 sm:text-lg">
                  Log in
                </Link>
                <a href={DEMO_URL} className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-blue-500 px-6 py-4 text-center text-base font-bold text-blue-600 transition-all hover:-translate-y-0.5 hover:bg-blue-50 sm:px-8 sm:py-5 sm:text-lg">
                  Try demo
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-white py-10 shadow-sm sm:mt-20 sm:py-16" id="faq">
          <div className="px-5 sm:px-6 lg:px-8">
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

        <ScrollReveal delay={80}>
          <section
            id="for-contractors"
            className="mt-12 scroll-mt-24 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 py-10 shadow-sm sm:mt-20 sm:py-14"
            aria-labelledby="for-contractors-heading"
          >
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <h2
                id="for-contractors-heading"
                className="text-center font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
              >
                Why fence contractors choose QuoteMyFence
              </h2>
              <p className="mt-4 text-center text-slate-600 sm:text-lg">
                Whether you install privacy PVC, wood-look composite, or chain link, your buyers want speed and clarity. QuoteMyFence is{' '}
                <strong className="font-semibold text-slate-800">fence estimate software</strong> that pairs{' '}
                <strong className="font-semibold text-slate-800">satellite fence mapping</strong> with your real catalog and pricing—so homeowners self-serve an instant quote and you get{' '}
                <strong className="font-semibold text-slate-800">pre-qualified fence leads</strong> with drawings and lengths, not vague phone tags.
              </p>
              <p className="mt-4 text-center text-slate-600">
                Canadian fence companies use it to compete on professionalism: a branded link, 24/7 capture, and a dashboard built for sales—not spreadsheets. Explore our{' '}
                <Link href="/blog" className="font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700">
                  contractor blog
                </Link>{' '}
                for quoting and lead tips, or start a free trial and publish your first quote page in one sitting.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Big CTA */}
        <section id="contact" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-700/60 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-center sm:mt-20 sm:p-12 lg:p-16">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Your fence business deserves more than guesswork
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-blue-100">
            See the platform in action. Discover how contractors are closing more deals with less effort. Your future leads are waiting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4">
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:-translate-y-0.5 hover:scale-105 hover:bg-blue-50 hover:shadow-2xl sm:px-10 sm:text-lg"
            >
              Book a meeting
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-white px-6 py-4 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:scale-105 hover:bg-white/10 sm:px-10 sm:text-lg"
            >
              Contact us
            </a>
            <a
              href={DEMO_URL}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-white px-6 py-4 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:scale-105 hover:bg-white/10 sm:px-10 sm:text-lg"
            >
              Try demo free
            </a>
          </div>
        </section>

        {/* Footer - light theme */}
        <footer className="safe-area-b mt-12 border-t border-slate-200 bg-white/80 py-10 sm:mt-20 sm:py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/" className="flex items-center opacity-80 transition-opacity hover:opacity-100">
                <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto" />
              </Link>
              <p className="mt-4 max-w-xs text-sm text-slate-600">
                The fence industry&apos;s go-to for instant estimates & qualified leads. Scale smarter. 24/7. Global.
              </p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="font-bold text-slate-900">Product</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
                  <Link href="/signup" className="hover:text-slate-900">Sign up</Link>
                  <Link href="/login" className="hover:text-slate-900">Log in</Link>
                  <a href="/#demo" className="hover:text-slate-900">Demo video</a>
                  <a href="/#quote-calculator" className="hover:text-slate-900">Quote calculator</a>
                  <a href="/#roi-calculator" className="hover:text-slate-900">ROI calculator</a>
                  <a href="/#how-it-works" className="hover:text-slate-900">How it works</a>
                  <a href="/#pricing" className="hover:text-slate-900">Pricing</a>
                  <Link href="/blog" className="hover:text-slate-900">Blog</Link>
                  <Link href="/press" className="hover:text-slate-900">Press</Link>
                  <Link href="/partners" className="hover:text-slate-900">Partners</Link>
                  <a href={DEMO_URL} className="hover:text-slate-900">Try live demo</a>
                  <a href="/#faq" className="hover:text-slate-900">FAQ</a>
                  <a href="/#for-contractors" className="hover:text-slate-900">For contractors</a>
                  <a href="/#contact" className="hover:text-slate-900">Contact</a>
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-900">Contact</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
                  <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">
                    Book a call
                  </a>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-slate-900">
                    Email us
                  </a>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-slate-200 pt-8 text-sm text-slate-500">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> QuoteMyFence. All rights reserved.
          </p>
        </footer>
        </main>
      </div>
      <BackToTop />
      <DesktopCTARail />
      <StickyMobileCTA />
    </div>
  );
}
