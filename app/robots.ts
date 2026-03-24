import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.quotemyfence.ca';

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteUrl.replace(/\/$/, ''),
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/dashboard/', '/api', '/auth', '/master', '/login'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard', '/api', '/master', '/login'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/dashboard', '/api', '/master', '/login'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
