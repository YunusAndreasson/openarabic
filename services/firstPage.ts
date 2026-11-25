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

/** Local content for the public widget and legacy review receipts. */
export const loadFirstPage = (): BundledPassage => passageFixture;
