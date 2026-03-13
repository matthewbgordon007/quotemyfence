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
    default: 'QuoteMyFence | Fence estimates + contractor dashboards',
    template: '%s | QuoteMyFence',
  },
  description:
    'QuoteMyFence helps homeowners draw fence lines on a map to get an instant estimate, and helps contractors manage products, pricing, and leads. Trusted by fence contractors across Canada.',
  keywords: ['fence estimate', 'fence quote', 'fence contractor', 'fence calculator', 'instant estimate', 'Canada'],
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: siteUrl,
    siteName: 'QuoteMyFence',
    title: 'QuoteMyFence | Draw your fence. Get your estimate.',
    description: 'Draw your fence line on a map for an instant estimate. For homeowners and fence contractors across Canada.',
    images: [{ url: '/quotemyfence-logo.png', width: 512, height: 512, alt: 'QuoteMyFence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuoteMyFence | Draw your fence. Get your estimate.',
    description: 'Draw your fence line on a map for an instant estimate. For homeowners and fence contractors.',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QuoteMyFence',
  },
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
