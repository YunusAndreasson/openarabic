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

// Storefront-neutral App Store link (no /ae/ country code) so Apple redirects
// each visitor to their own regional store instead of geo-pinning to the UAE.
export const APP_STORE_URL =
  'https://apps.apple.com/app/openarabic/id1594031029';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.edenmind.OpenArabic';

/** Short positioning line. Nothing in the app teaches the script, so it says so. */
export const APP_TAGLINE = 'If you can sound out Arabic script, you can start reading classical texts.';

/** One calm line, wherever audio and translation are described. Owner to approve the wording. */
export const AI_DISCLOSURE = 'The audio uses AI voices and the English is machine-translated.';

/** One-paragraph description (manifest, structured data, download page lead). */
export const APP_DESCRIPTION = `Read classical Islamic texts by Ibn al-Qayyim, Ibn Taymiyyah, Imam Nawawī and more in Arabic, with English above every Arabic line. One tap gives you the meaning, a grammar note and audio. Hear the Arabic, then say what it means in English. The app grades your answer. ${AI_DISCLOSURE}`;

/** Headline benefits shown as a feature grid / chips. */
export const APP_FEATURES = [
  'Bilingual texts',
  'Arabic audio',
  'Spaced repetition',
  'Free & no ads',
] as const;
