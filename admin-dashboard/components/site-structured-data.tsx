import { APP_NAME } from '@/lib/app';
import { SITE_URL } from '@/lib/constants';

/**
 * Site-wide JSON-LD (Organization + WebSite) for the root layout.
 *
 * Strengthens brand/entity signals in Google. No WebSite `SearchAction` is
 * emitted — the site offers category filtering, not a free-text search
 * endpoint, so a SearchAction would point nowhere.
 */
export function SiteStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: APP_NAME,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/oaLogo.png`,
        },
        sameAs: [
          'https://x.com/openarabicio',
          'https://www.instagram.com/openarabic.io/',
          'https://www.facebook.com/OpenArabic.io/',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: APP_NAME,
        url: SITE_URL,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
