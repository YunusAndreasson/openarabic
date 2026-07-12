/**
 * Real in-app screenshots (full-screen iPhone captures) plus the marketing copy
 * that frames each one. Single source of truth for the download page's feature
 * showcase, the homepage hero mockups, and the MobileApplication JSON-LD — update
 * the copy or swap an image here and every surface stays in sync.
 *
 * Assets live in public/screenshots (full device screen, 900×1957 WebP). To swap
 * one, rename the file too (the path is a cache key) and update its src below.
 */

export interface AppScreenshot {
  /** Path under /public. */
  src: string;
  /** Descriptive alt text (also the screen's purpose). */
  alt: string;
  /** One-word verb that labels the step. */
  label: string;
  /** Feature heading, written from the reader's side of the screen. */
  title: string;
  /** One tight sentence on what the reader can do. */
  description: string;
  /** A short supporting detail line (rendered as quiet meta). */
  meta: string;
}

export const SCREENSHOTS: AppScreenshot[] = [
  {
    src: '/screenshots/explore-library.webp',
    alt: 'The Explore screen with featured classical texts by Ibn al-Jawzī and topic categories',
    label: 'Explore',
    title: 'A library of the classics',
    description:
      'Ibn al-Qayyim, Ibn Taymiyyah, Ibn al-Jawzī, Imam Nawawī and more — real works on creed, fiqh, sīrah and tafsīr, sorted by topic. Open one and the app keeps your place for next time.',
    meta: 'ʿAqīdah · Fiqh · Sīrah · Ḥadīth · Tafsīr',
  },
  {
    src: '/screenshots/read-side-by-side.webp',
    alt: 'A classical text shown with Arabic and English side by side, one word tapped for a hint',
    label: 'Read',
    title: 'Arabic and English, side by side',
    description:
      'Each line of Arabic sits above its English, so you read the actual text instead of a translation of it. When the help starts to feel slow, switch to Arabic-only.',
    meta: 'Bilingual & Arabic-only · graded by difficulty',
  },
  {
    src: '/screenshots/tap-word.webp',
    alt: 'A tapped word showing its meaning, a grammar note, native audio and an add-to-practice button',
    label: 'Understand',
    title: 'Tap any word you don’t know',
    description:
      'One tap opens its meaning, a short grammar note, and native audio — and drops it into your practice deck. No dictionary, no losing your place on the page.',
    meta: 'Instant meaning · grammar note · native audio',
  },
  {
    src: '/screenshots/listen-audio.webp',
    alt: 'A playlist of classical texts you can listen to with narrated audio',
    label: 'Listen',
    title: 'Hear it read, back to back',
    description:
      'Queue a text and listen to it narrated — each Arabic line followed by its English — on a walk or a commute. Everything works offline once it’s downloaded.',
    meta: 'Narrated texts · Arabic then English · offline',
  },
  {
    src: '/screenshots/speak-aloud.webp',
    alt: 'A practice flashcard with a microphone to say the Arabic word out loud',
    label: 'Speak',
    title: 'Say the word out loud',
    description:
      'Recall each word by speaking it — tap the mic and the app listens and grades you. It’s the difference between recognising a word and actually owning it.',
    meta: 'Voice-graded · Forgot · Guessed · Knew it',
  },
  {
    src: '/screenshots/spaced-repetition.webp',
    alt: 'A practice dashboard showing memory strength, words due, streak, and mastered count',
    label: 'Remember',
    title: 'Spaced repetition makes it stick',
    description:
      'Every word you tap joins a deck that brings it back right before you’d forget it. Your memory strength climbs a little more with each short session.',
    meta: 'FSRS spaced repetition · a few minutes a day',
  },
];

/** The two screens fanned in the hero mockup: front (primary), then behind. */
export const HERO_SCREENSHOTS = {
  front: SCREENSHOTS[0], // explore-library (the app's start screen — inviting, content-rich)
  back: SCREENSHOTS[5], // spaced-repetition (memory-strength gauge)
} as const;
