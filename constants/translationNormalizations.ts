/**
 * Translation Normalization Rules for Arabic Word Combinations
 *
 * This module provides normalization rules to replace variable English translations
 * with consistent translations for specific Arabic words.
 *
 * Purpose: When we see a specific Arabic word, always display it with the same
 * English translation for consistency and proper component detection/coloring.
 *
 * Example: فقد in the database might be "and so", "then", "so indeed", etc.
 * We normalize ALL of these to consistently show "so indeed".
 */

/**
 * Represents a single normalization rule for Arabic word combinations
 */
export interface TranslationNormalizationRule {
  /** Arabic word (without diacritics) */
  arabic: string;
  /** Consistent English translation to always use for this Arabic word */
  normalizedEnglish: string;
  /** Description for documentation */
  description: string;
}

/**
 * Collection of translation normalization rules
 *
 * Rules are based on common Arabic word combinations that appear
 * in the database with transliterations rather than translations.
 *
 * Each rule maps one or more transliteration variants to the correct
 * compositional translation.
 */
export const TRANSLATION_NORMALIZATION_RULES: TranslationNormalizationRule[] = [
  {
    arabic: 'ولا',
    normalizedEnglish: 'and not',
    description: 'و (and) + لا (not)',
  },
  {
    arabic: 'فلا',
    normalizedEnglish: 'so not',
    description: 'ف (so) + لا (not)',
  },
  {
    arabic: 'ولم',
    normalizedEnglish: 'and did not',
    description: 'و (and) + لم (did not)',
  },
  {
    arabic: 'فلم',
    normalizedEnglish: 'so did not',
    description: 'ف (so) + لم (did not)',
  },
  {
    arabic: 'ولن',
    normalizedEnglish: 'and will not',
    description: 'و (and) + لن (will not)',
  },
  {
    arabic: 'فلن',
    normalizedEnglish: 'so will not',
    description: 'ف (so) + لن (will not)',
  },
  {
    arabic: 'وبال',
    normalizedEnglish: 'and with the',
    description: 'و (and) + ب (with) + ال (the)',
  },
  {
    arabic: 'فبال',
    normalizedEnglish: 'so with the',
    description: 'ف (so) + ب (with) + ال (the)',
  },
  {
    arabic: 'ولل',
    normalizedEnglish: 'and for the',
    description: 'و (and) + ل (for) + ال (the)',
  },
  {
    arabic: 'فلل',
    normalizedEnglish: 'so for the',
    description: 'ف (so) + ل (for) + ال (the)',
  },
  {
    arabic: 'مما',
    normalizedEnglish: 'for what',
    description: 'من (from) + ما (what) - normalized to "for what"',
  },
  {
    arabic: 'فمن',
    normalizedEnglish: 'so whoever',
    description: 'ف (so) + من (whoever)',
  },
  {
    arabic: 'ومن',
    normalizedEnglish: 'and whoever',
    description: 'و (and) + من (whoever)',
  },
  {
    arabic: 'بما',
    normalizedEnglish: 'with what',
    description: 'ب (with) + ما (what)',
  },
  {
    arabic: 'فإن',
    normalizedEnglish: 'so indeed',
    description: 'ف (so) + إن (indeed)',
  },
  {
    arabic: 'وإن',
    normalizedEnglish: 'and indeed',
    description: 'و (and) + إن (indeed)',
  },
  // NOTE: فقد intentionally EXCLUDED — ambiguous:
  // فقد = ف+قد (so indeed) OR root فقد (to lose/miss)
  // When used as compound, ف will match "so" and قد will match "indeed" directly.
  {
    arabic: 'وقد',
    normalizedEnglish: 'and indeed',
    description: 'و (and) + قد (indeed/already)',
  },
  {
    arabic: 'فإذا',
    normalizedEnglish: 'so when',
    description: 'ف (so) + إذا (when/if)',
  },
  {
    arabic: 'وإذا',
    normalizedEnglish: 'and when',
    description: 'و (and) + إذا (when/if)',
  },
  {
    arabic: 'كما',
    normalizedEnglish: 'as for',
    description: 'ك (as/like) + ما (what/for)',
  },
  {
    arabic: 'وكما',
    normalizedEnglish: 'and as for',
    description: 'و (and) + ك (as) + ما (for)',
  },
  {
    arabic: 'فكما',
    normalizedEnglish: 'so as for',
    description: 'ف (so) + ك (as) + ما (for)',
  },
  {
    arabic: 'فما',
    normalizedEnglish: 'so what',
    description: 'ف (so) + ما (what)',
  },
  {
    arabic: 'وما',
    normalizedEnglish: 'and what',
    description: 'و (and) + ما (what)',
  },
  // Pronoun combinations (conjunction + pronoun)
  {
    arabic: 'فهو',
    normalizedEnglish: 'so he',
    description: 'ف (so) + هو (he)',
  },
  {
    arabic: 'وهو',
    normalizedEnglish: 'and he',
    description: 'و (and) + هو (he)',
  },
  {
    arabic: 'فهي',
    normalizedEnglish: 'so she',
    description: 'ف (so) + هي (she)',
  },
  {
    arabic: 'وهي',
    normalizedEnglish: 'and she',
    description: 'و (and) + هي (she)',
  },
  // NOTE: فهم and وهم intentionally EXCLUDED — they are ambiguous:
  // فهم = ف+هم (so they) OR root فهم (to understand)
  // وهم = و+هم (and they) OR root وهم (illusion/delusion)
  // When used as compounds, ف/و will match "so/and" and هم will match "they" directly.
  {
    arabic: 'فهن',
    normalizedEnglish: 'so they',
    description: 'ف (so) + هن (they - feminine)',
  },
  {
    arabic: 'وهن',
    normalizedEnglish: 'and they',
    description: 'و (and) + هن (they - feminine)',
  },
  // Preposition + negation combinations
  {
    arabic: 'بلا',
    normalizedEnglish: 'with no',
    description: 'ب (with) + لا (no)',
  },
  {
    arabic: 'فبلا',
    normalizedEnglish: 'so with no',
    description: 'ف (so) + ب (with) + لا (no)',
  },
  {
    arabic: 'وبلا',
    normalizedEnglish: 'and with no',
    description: 'و (and) + ب (with) + لا (no)',
  },
];

/**
 * Pre-computed lookup map for O(1) translation normalization
 *
 * Structure: Map<arabicWord, normalizedEnglish>
 *
 * Example:
 * Map {
 *   'ولا' => 'and not',
 *   'فلا' => 'so not',
 *   'فقد' => 'so indeed',
 * }
 */
export const NORMALIZATION_MAP = new Map<string, string>(
  TRANSLATION_NORMALIZATION_RULES.map(rule => [
    // Normalize alef variants to match normalizeArabic() output (إ/آ/ٱ only, NOT أ)
    rule.arabic.replace(/[إآٱ]/g, 'ا'),
    rule.normalizedEnglish,
  ]),
);
