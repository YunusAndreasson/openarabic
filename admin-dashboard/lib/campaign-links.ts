/**
 * Carries a tracked link's campaign through the store redirect. Each store has its
 * own form, and a plain `?utm_source=` on a store URL is ignored by both, so
 * without this the /download-app redirect loses the campaign entirely.
 *
 * - Google Play takes the tags inside `referrer`, and the app can read them back.
 * - The App Store takes `ct` (a campaign token, 40 characters at most) and `pt`
 *   (the provider token from App Store Connect, App Analytics, Campaigns).
 *
 * Pure and edge-safe, because middleware calls it.
 */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

const MAX_VALUE_LENGTH = 100;
const APPLE_TOKEN_LIMIT = 40;

// Only values that can't break out of the URL or a report end up in a redirect.
const SAFE_VALUE = /^[\w.~-]+$/;

const safeValue = (value: string | null): string | null =>
  value && value.length <= MAX_VALUE_LENGTH && SAFE_VALUE.test(value) ? value : null;

export function withCampaign(
  storeUrl: string,
  params: URLSearchParams,
  providerToken: string | undefined,
): string {
  const url = new URL(storeUrl);

  if (url.hostname === 'play.google.com') {
    const tags = new URLSearchParams();
    for (const key of UTM_KEYS) {
      const value = safeValue(params.get(key));
      if (value) tags.set(key, value);
    }
    if ([...tags].length > 0) url.searchParams.set('referrer', tags.toString());
    return url.toString();
  }

  if (url.hostname === 'apps.apple.com') {
    const campaign = safeValue(params.get('utm_campaign'));
    if (campaign && providerToken) {
      url.searchParams.set('pt', providerToken);
      url.searchParams.set('ct', campaign.slice(0, APPLE_TOKEN_LIMIT));
      url.searchParams.set('mt', '8');
    }
    return url.toString();
  }

  return storeUrl;
}
