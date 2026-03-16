import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.quotemyfence.ca';

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteUrl.replace(/\/$/, ''),
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog', '/blog/', '/signup', '/estimate/'],
        disallow: ['/dashboard', '/dashboard/', '/api', '/auth', '/master'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
