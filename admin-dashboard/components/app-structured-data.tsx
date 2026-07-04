import {
  APP_NAME,
  APP_DESCRIPTION,
  APP_STORE_URL,
  PLAY_STORE_URL,
} from '@/lib/app';
import { SCREENSHOTS } from '@/lib/app-screenshots';
import { SITE_URL } from '@/lib/constants';

/**
 * JSON-LD structured data describing the OpenArabic mobile app.
 * Enables rich app results in Google search (free, iOS + Android, install links,
 * real screenshots).
 *
 * Note: no `aggregateRating` is emitted — fabricated ratings get structured data
 * demoted/penalized. Add it only when real review counts are wired in.
 */
export function AppStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: APP_NAME,
    description: APP_DESCRIPTION,
    operatingSystem: 'iOS, Android',
    applicationCategory: 'EducationApplication',
    image: `${SITE_URL}/oaLogo.png`,
    screenshot: SCREENSHOTS.map((s) => `${SITE_URL}${s.src}`),
    url: SITE_URL,
    installUrl: [APP_STORE_URL, PLAY_STORE_URL],
    // Tie the app to the site-wide Organization (defined in SiteStructuredData).
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
