import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'QuoteMyFence | Fence estimates + contractor dashboards',
  description:
    'QuoteMyFence helps homeowners draw fence lines on a map to get an instant estimate, and helps contractors manage products, pricing, and leads.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QuoteMyFence',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-screen antialiased"
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
