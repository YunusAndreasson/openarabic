import { analyticsBootstrapScript } from '@/lib/analytics-consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Google Analytics 4, loaded only after a visitor agrees.
 *
 * This renders the bootstrap alone, with no gtag.js <script> tag, so a visitor who
 * hasn't agreed makes no request to Google. Search Console's "Google Analytics"
 * ownership check can no longer see the tag, but the property also verifies with
 * the HTML meta tag in layout.tsx. Renders nothing unless NEXT_PUBLIC_GA_ID is set.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return <script dangerouslySetInnerHTML={{ __html: analyticsBootstrapScript(GA_ID) }} />;
}
