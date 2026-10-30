import { ANALYTICS_CONSENT_KEY } from '@/lib/analytics-consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Google Analytics 4, measuring only after a visitor agrees.
 *
 * The tag stays in <head> as raw <script> tags rather than next/script, because
 * Search Console's "Google Analytics" ownership verification only accepts it
 * there. But `gtag('config')` is what starts measuring, and it only runs once
 * consent exists: here for a returning visitor, and from AnalyticsConsent for one
 * who has just agreed. Storage stays denied until then, so nothing is written to
 * the device. Renders nothing unless NEXT_PUBLIC_GA_ID is set.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('js', new Date());
try {
  if (localStorage.getItem('${ANALYTICS_CONSENT_KEY}') === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('config', '${GA_ID}');
  }
} catch (e) {}`,
        }}
      />
    </>
  );
}
