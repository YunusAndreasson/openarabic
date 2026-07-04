/**
 * Real in-app screenshots (from the App Store listing) plus the marketing copy
 * that frames each one. Single source of truth for the download page's feature
 * showcase and the homepage hero mockups — update the copy or swap an image
 * here and every surface stays in sync.
 *
 * Assets live in public/screenshots (cropped to the app screen, 760×1060 WebP).
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
    src: '/screenshots/read-bilingual.webp',
    alt: 'A classical text by Imam Nawawī shown with Arabic and English side by side',
    label: 'Read',
    title: 'The real texts, side by side',
    description:
      'Classical works from scholars like Imam Nawawī, with Arabic and English on one page. Switch to Arabic-only when you’re ready.',
    meta: 'Bilingual & Arabic-only · graded by difficulty',
  },
  {
    src: '/screenshots/tap-translate.webp',
    alt: 'Reading in Arabic with a prompt to tap any word for its translation',
    label: 'Understand',
    title: 'Tap any word you don’t know',
    description:
      'The meaning, the root, and the pronunciation appear right there — so you keep reading instead of reaching for a dictionary.',
    meta: 'Instant meanings · root & grammar',
  },
  {
    src: '/screenshots/dictionary-audio.webp',
    alt: 'A vocabulary list with a play button and pronunciation for each word',
    label: 'Listen',
    title: 'Hear every word spoken',
    description:
      'Native audio for each word and phrase teaches you how classical Arabic actually sounds. Works fully offline.',
    meta: 'Native pronunciation · word by word',
  },
  {
    src: '/screenshots/practice-quiz.webp',
    alt: 'A short quiz drawn from a text the reader just finished',
    label: 'Practice',
    title: 'Turn reading into recall',
    description:
      'Short quizzes built from the passage you just read turn words you barely recognised into words you can produce.',
    meta: 'From your reading · quick sessions',
  },
  {
    src: '/screenshots/vocabulary.webp',
    alt: 'Vocabulary settings for the number of words and difficulty level',
    label: 'Remember',
    title: 'Keep the words you earn',
    description:
      'Every word you tap enters a spaced-repetition deck that brings it back right before you’d forget it.',
    meta: 'FSRS spaced repetition · set your own pace',
  },
];

/** The two screens fanned in the hero mockup: front (primary), then behind. */
export const HERO_SCREENSHOTS = {
  front: SCREENSHOTS[0], // read-bilingual
  back: SCREENSHOTS[2], // dictionary-audio
} as const;
