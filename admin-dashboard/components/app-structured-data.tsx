import {
  APP_NAME,
  APP_DESCRIPTION,
  APP_STORE_URL,
  PLAY_STORE_URL,
} from '@/lib/app';

/**
 * JSON-LD structured data describing the OpenArabic mobile app.
 * Enables rich app results in Google search (free, iOS + Android, install links).
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
    image: 'https://openarabic.io/oaLogo.png',
    url: 'https://openarabic.io',
    installUrl: [APP_STORE_URL, PLAY_STORE_URL],
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
