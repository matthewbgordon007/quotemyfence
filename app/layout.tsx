import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.quotemyfence.ca';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'QuoteMyFence | #1 Fence Estimate Software for Contractors | Instant Quotes & Lead Capture',
    template: '%s | QuoteMyFence',
  },
  description:
    'The #1 fence estimate software for contractors. Turn tire-kickers into ready-to-buy leads. Instant quotes, satellite mapping, 24/7 lead capture. Trusted across Canada. Try free.',
  keywords: [
    'fence estimate software',
    'fence quote software',
    'fence contractor software',
    'instant fence estimate',
    'fence quote calculator',
    'fence lead generation',
    'fence estimate tool',
    'satellite fence mapping',
    'fence contractor leads',
    'Canada fence software',
    'fence business software',
    'quote my fence',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: siteUrl,
    siteName: 'QuoteMyFence',
    title: 'QuoteMyFence | #1 Fence Estimate Software for Contractors | Instant Quotes & Lead Capture',
    description:
      'The #1 fence estimate software. Turn tire-kickers into ready-to-buy leads. Instant quotes, satellite mapping, 24/7 lead capture. Trusted by fence contractors across Canada.',
    images: [
      {
        url: '/QuoteMyFence.png',
        width: 1200,
        height: 630,
        alt: 'QuoteMyFence fence estimate software',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@quotemyfence',
    title: 'QuoteMyFence | #1 Fence Estimate Software for Contractors',
    description:
      'Instant quotes, satellite mapping, 24/7 lead capture. Trusted by fence contractors across Canada. Try free.',
    images: ['/QuoteMyFence.png'],
  },
  alternates: {
    canonical: '/',
  },
  authors: [{ name: 'QuoteMyFence Team', url: siteUrl }],
  creator: 'QuoteMyFence',
  publisher: 'QuoteMyFence',
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QuoteMyFence',
  },
  category: 'technology',
  applicationName: 'QuoteMyFence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${plusJakarta.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preload" href="/videos/QuoteProcess.mp4" as="video" type="video/mp4" />
      </head>
      <body
        className="min-h-screen antialiased selection:bg-blue-100 font-sans"
        style={{
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: '#0f172a',
          backgroundColor: '#f8fafc',
        }}
      >
        {children}
      </body>
    </html>
  );
}
