import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/articles', '/ai-test', '/images', '/login'],
      },
    ],
    sitemap: 'https://openarabic.io/sitemap.xml',
  };
}
