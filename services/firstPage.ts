import { passageFixture } from '@/assets/first-page/passage';
import type { ThemeColors } from '@/types/ui/theme.types';

export interface PassageWord {
  form: string;
  gloss: string;
  /** Static Metro audio module. A missing recording never falls back to the network. */
  audio?: number;
  segments?: readonly { text: string; role?: keyof ThemeColors['grammar'] }[];
  /** Present only after an occurrence-to-dictionary join has been verified. */
  practice?: { occurrenceId: number; rootId: number; letters: string; meaning: string };
  origin?: { letters: string; meaning: string; note: string };
  suggested?: boolean;
}

export interface BundledPassage {
  articleId?: number;
  title: string;
  author: string;
  category: string;
  credit: string;
  cover: number;
  audio?: number;
  sentences: readonly {
    sentenceId?: number;
    translation: string;
    words: readonly PassageWord[];
  }[];
}

/** A synchronous, local-only source for the reader and the future public widget. */
export const loadFirstPage = (): BundledPassage => passageFixture;

// The public article reader can reach the same occurrences through Browse.
// Respect an omitted practice mapping on that exact line and position.
export function guestCanPractise(
  articleId: number,
  word: { sentence_id: number; position: number; word_form: string; root_id: number },
) {
  if (!word.root_id) return false;
  const page = loadFirstPage();
  if (page.articleId !== articleId) return true;
  const bundled = page.sentences.find(line => line.sentenceId === word.sentence_id)?.words[
    word.position
  ];
  return bundled?.form !== word.word_form || bundled.practice?.rootId === word.root_id;
}
