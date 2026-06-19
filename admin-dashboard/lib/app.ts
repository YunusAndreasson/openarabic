/**
 * Single source of truth for OpenArabic mobile-app marketing data.
 *
 * Store URLs, identifiers, and promotional copy live here so every promotion
 * surface (download page, in-article CTA, header button, smart banner, manifest,
 * structured data) stays consistent. Update once, applies everywhere.
 */

export const APP_NAME = 'OpenArabic';

/** App Store numeric id (used by the apple-itunes-app Smart App Banner + manifest). */
export const APP_STORE_ID = '1594031029';

/** Android application id (used by manifest related_applications). */
export const ANDROID_PACKAGE = 'com.edenmind.OpenArabic';

export const APP_STORE_URL =
  'https://apps.apple.com/ae/app/openarabic/id1594031029';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.edenmind.OpenArabic';

/** Short benefit-forward tagline. */
export const APP_TAGLINE = 'Read classical Arabic — even as a beginner';

/** One-paragraph description (manifest, structured data, download page lead). */
export const APP_DESCRIPTION =
  'Read classical Islamic texts in Arabic with English translations. Tap unknown words, listen to native audio, and build vocabulary through spaced repetition.';

/** Headline benefits shown as a feature grid / chips. */
export const APP_FEATURES = [
  'Bilingual texts',
  'Native audio',
  'Spaced repetition',
  'Free & no ads',
] as const;
