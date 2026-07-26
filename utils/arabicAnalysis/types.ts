/**
 * Type definitions for Arabic word analysis
 */

import type {
  ComponentType,
  WordComponent,
  GrammaticalRole,
} from '@/constants/arabicWordComponents';

export interface AnalyzedComponent {
  component: WordComponent;
  arabicMatch: string;
  englishMatches: string[];
  matchedInEnglish: boolean;
  /** If set, this component should inherit the color from the specified component type */
  inheritColorFrom?: ComponentType;
  /** Grammatical role for educational color differentiation (e.g., conjunction vs. article) */
  role?: GrammaticalRole;
  /** Position in sequence for ordered components (e.g., prefix[0], prefix[1]) */
  position?: number;
}

export interface WordAnalysis {
  original: {
    arabic: string;
    english: string;
  };
  prefixes: AnalyzedComponent[]; // Changed from prefix?: AnalyzedComponent to support multiple prefixes
  infix?: AnalyzedComponent;
  suffix?: AnalyzedComponent;
  diacritic?: AnalyzedComponent;
  hasComponents: boolean;
  remainingArabic: string;
  remainingEnglish: string;
  hasBracketInjection?: boolean;
  /**
   * Normalized-character count consumed off the front of the word before prefix
   * detection began, without producing a component — an elided connective the gloss
   * dropped (وَالسَّمَاءِ "the sky"). It has no English counterpart, so it must not be
   * painted, but the renderer still has to skip it or every prefix span lands one
   * character too far left. See `consumeElidedConjunction` in prefixDetection.ts.
   */
  elidedPrefixLength?: number;
}
