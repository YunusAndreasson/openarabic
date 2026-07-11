import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_STORE_URL,
  PLAY_STORE_URL,
} from '@/lib/app';
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
        // The maker behind OpenArabic (shared Person @id across all his sites).
        creator: { '@id': 'https://andreassonphoto.com/#person' },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: APP_NAME,
        url: SITE_URL,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      // Person node for Yunus Andreasson — identical @id on every site he
      // builds so the profiles consolidate into one entity for search engines.
      {
        '@type': 'Person',
        '@id': 'https://andreassonphoto.com/#person',
        name: 'Yunus Andreasson',
        alternateName: ['Jonas Yūnus Andrèasson'],
        url: 'https://andreassonphoto.com',
        sameAs: [
          'https://github.com/YunusAndreasson',
          'https://x.com/YunusAndreasson',
          'https://www.instagram.com/andreasson.photo/',
          'https://www.linkedin.com/in/yunusandreasson/',
        ],
      },
      // The Open Arabic app itself — feeds Google's app rich results and ties
      // the app back to its maker (author) and the org (publisher). No
      // aggregateRating/review is emitted: we have no verified rating data and
      // fabricating it would violate Google's structured-data policy. The free
      // `offers` node keeps it rich-result-eligible without a rating.
      {
        '@type': 'MobileApplication',
        '@id': `${SITE_URL}#app`,
        name: APP_NAME,
        operatingSystem: 'iOS, Android',
        applicationCategory: 'EducationalApplication',
        url: SITE_URL,
        description: APP_DESCRIPTION,
        author: { '@id': 'https://andreassonphoto.com/#person' },
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        installUrl: APP_STORE_URL,
        downloadUrl: APP_STORE_URL,
        sameAs: [APP_STORE_URL, PLAY_STORE_URL],
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
