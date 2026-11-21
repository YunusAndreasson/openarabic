/** The key a visitor's analytics choice is stored under. Read by the inline bootstrap too. */
export const ANALYTICS_CONSENT_KEY = 'oa-analytics-consent';

export type AnalyticsChoice = 'granted' | 'denied';

const CHANGED_EVENT = 'oa-analytics-consent-changed';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /** Set by the bootstrap in <head>. Loads gtag.js, which nothing does before consent. */
    oaStartAnalytics?: () => void;
    [gaDisableFlag: `ga-disable-${string}`]: boolean;
  }
}

/**
 * The inline <head> script. It never touches the network by itself: gtag.js is the
 * first request to Google and is only added by oaStartAnalytics, which runs when
 * the stored choice is 'granted' or the visitor has just agreed. Consent mode alone
 * would not do, because a loaded gtag.js sends cookieless pings while denied, and
 * this site's traffic can suggest religion.
 */
export function analyticsBootstrapScript(gaId: string): string {
  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
window.oaStartAnalytics = function () {
  window['ga-disable-${gaId}'] = false;
  gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', '${gaId}', { allow_google_signals: false, allow_ad_personalization_signals: false });
  if (document.getElementById('oa-gtag')) return;
  var s = document.createElement('script');
  s.id = 'oa-gtag';
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=${gaId}';
  document.head.appendChild(s);
};
try {
  if (localStorage.getItem('${ANALYTICS_CONSENT_KEY}') === 'granted') window.oaStartAnalytics();
} catch (e) {}`;
}

/** Holds the choice for this visit when the browser blocks storage. */
let thisVisit: AnalyticsChoice | null = null;

/** A blocked or failed read means no choice has been made, so nothing is measured. */
export function readAnalyticsChoice(): AnalyticsChoice | null {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : thisVisit;
  } catch {
    return thisVisit;
  }
}

export function saveAnalyticsChoice(choice: AnalyticsChoice): void {
  thisVisit = choice;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, choice);
  } catch {
    // Kept for this visit only.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function subscribeAnalyticsChoice(listener: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, listener);
  return () => window.removeEventListener(CHANGED_EVENT, listener);
}

/** The cookies gtag.js writes: _ga and _ga_<container>, plus the legacy _gid and _gat. */
const ANALYTICS_COOKIE = /^(_ga(_.*)?|_gid|_gat.*)$/;

function clearAnalyticsCookies(): void {
  const names = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((name) => ANALYTICS_COOKIE.test(name));

  // gtag.js sets these on the highest domain it can, so try every level of the host.
  const labels = window.location.hostname.split('.');
  const domains = [undefined, ...labels.slice(0, -1).map((_, i) => labels.slice(i).join('.'))];

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

/**
 * Stop measuring now, in this page as well as the next. A gtag.js that is already
 * loaded would otherwise keep sending cookieless pings on client-side navigations,
 * so the ga-disable flag is what makes withdrawing silent. Cookies already written
 * go too.
 */
export function stopAnalytics(gaId: string): void {
  window[`ga-disable-${gaId}`] = true;
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  clearAnalyticsCookies();
}
