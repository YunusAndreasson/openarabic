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
      'Ibn al-Qayyim, Ibn Taymiyyah, Ibn al-Jawzī, Imam Nawawī and more — excerpts on creed, fiqh, sīrah and tafsīr, sorted by topic. Open one and the app keeps your place for next time.',
    meta: 'ʿAqīdah · Fiqh · Sīrah · Ḥadīth · Tafsīr',
  },
  {
    src: '/screenshots/read-side-by-side.webp',
    alt: 'A classical text shown with English above every Arabic line, one word tapped for a hint',
    label: 'Read',
    title: 'English above every Arabic line',
    description:
      'Read the Arabic itself, with English line by line.',
    meta: 'Sorted by difficulty',
  },
  {
    src: '/screenshots/tap-word.webp',
    alt: 'A tapped word showing its meaning, a grammar note, audio and an add-to-practice button',
    label: 'Understand',
    title: 'Tap any word you don’t know',
    description:
      'One tap gives you the meaning, a grammar note and audio. Long-press to save it to practice without losing your place.',
    meta: 'Instant meaning · grammar note · audio',
  },
  {
    src: '/screenshots/listen-audio.webp',
    alt: 'A playlist of classical texts you can listen to',
    label: 'Listen',
    title: 'Hear it read, back to back',
    description:
      'Queue any text and listen on a walk or a commute. Every text plays English first, then Arabic, or Arabic only. Audio you have played stays on your phone, and reviews made offline sync when you reconnect.',
    meta: 'Switch the audio to Arabic-only.',
  },
  {
    src: '/screenshots/speak-aloud.webp',
    alt: 'A practice flashcard with a microphone to say what the word means in English',
    label: 'Speak',
    title: 'Hear the Arabic, then say what it means in English',
    description:
      'The app grades your answer. You answer out loud before the app shows the meaning. Your voice is transcribed on your device and the audio is never uploaded. The text of your answer is saved.',
    meta: 'On your device, after a 100 MB download.',
  },
  {
    src: '/screenshots/spaced-repetition.webp',
    alt: 'A practice dashboard showing memory strength, words due, streak, and mastered count',
    label: 'Remember',
    title: 'Words return when your predicted recall falls to 90%',
    description:
      'FSRS scheduling adapts to how well you knew each word. Track your vocabulary, your streak and how long each word holds.',
    meta: 'You choose 10, 20 or 30 new words a day.',
  },
];

/** The two screens fanned in the hero mockup: front (primary), then behind. */
export const HERO_SCREENSHOTS = {
  front: SCREENSHOTS[0], // explore-library (the app's start screen — inviting, content-rich)
  back: SCREENSHOTS[5], // spaced-repetition (memory-strength gauge)
} as const;
