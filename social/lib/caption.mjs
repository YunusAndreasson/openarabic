// Branded per-word copy for each channel. Fixed template (no LLM) — cheap,
// consistent, on-brand.
//
// Platform note:
//   X — image-only. The card already carries the word, transliteration, and
//   meaning, so the tweet text is empty. This also sidesteps X's 2026 pay-per-use
//   pricing, which surcharges posts that contain a URL (~$0.20 vs ~$0.015).
//   Instagram — URLs in captions AND comments are NOT tappable (only the bio
//   link is), so we don't paste a dead URL there; the caption uses a "link in
//   bio" CTA and the first comment holds the hashtags (keeps the caption clean).

import { env } from './env.mjs'

export const wordUrl = (entry) => `${env.SITE_URL}/word/${entry.slug}`

const HASHTAGS_IG =
  '#Arabic #LearnArabic #ArabicWordOfTheDay #ClassicalArabic #Quran #IslamicStudies #Fusha #ArabicVocabulary'

/** X / Twitter post text — image-only, so no text rides on the tweet. */
export const buildXText = (_entry) => ''

/** Instagram feed caption — clean, no dead URL, hashtags live in the first comment. */
export const buildIgCaption = (entry) =>
  `${entry.arabic} — ${entry.translit}\n“${entry.english}”\n\n` +
  `Word of the day from OpenArabic. Read classical Islamic texts in Arabic with ` +
  `English translations, tap-to-translate, native audio, and spaced repetition — ` +
  `free on iPhone & Android. Link in bio.`

/** Instagram first comment — the hashtag block, kept out of the caption. */
export const buildIgFirstComment = (_entry) => HASHTAGS_IG
