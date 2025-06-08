/**
 * Arabic Word Components - Prefixes, Suffixes, and Common Words
 *
 * This file defines comprehensive rules for analyzing Arabic words and their English translations
 * to help users understand word structure and component meanings.
 */

export interface WordComponent {
  /** Arabic text pattern (regex) */
  arabic: string;
  /** English translation patterns that should contain this component */
  english: string[];
  /** Description for UI display */
  description: string;
  /** Type of component */
  type: 'prefix' | 'suffix' | 'common_word' | 'particle';
  /** Priority for matching (higher numbers match first) */
  priority: number;
}

/**
 * Arabic prefixes with their English equivalents
 */
export const ARABIC_PREFIXES: WordComponent[] = [
  // Definite article
  {
    arabic: '^ال',
    english: ['the'],
    description: 'the',
    type: 'prefix',
    priority: 100,
  },
  // Prepositions
  {
    arabic: '^ب',
    english: ['with', 'by', 'in'],
    description: 'with/by/in',
    type: 'prefix',
    priority: 90,
  },
  {
    arabic: '^ل',
    english: ['to', 'for'],
    description: 'to/for',
    type: 'prefix',
    priority: 90,
  },
  {
    arabic: '^ك',
    english: ['like', 'as'],
    description: 'like/as',
    type: 'prefix',
    priority: 90,
  },
  {
    arabic: '^في',
    english: ['in', 'at'],
    description: 'in/at',
    type: 'prefix',
    priority: 95,
  },
  {
    arabic: '^من',
    english: ['from', 'of'],
    description: 'from/of',
    type: 'prefix',
    priority: 95,
  },
  {
    arabic: '^إلى',
    english: ['to', 'towards'],
    description: 'to/towards',
    type: 'prefix',
    priority: 95,
  },
  {
    arabic: '^على',
    english: ['on', 'upon'],
    description: 'on/upon',
    type: 'prefix',
    priority: 95,
  },
  // Conjunctions
  {
    arabic: '^و',
    english: ['and'],
    description: 'and',
    type: 'prefix',
    priority: 85,
  },
  {
    arabic: '^ف',
    english: ['so', 'then'],
    description: 'so/then',
    type: 'prefix',
    priority: 85,
  },
  // Future tense marker
  {
    arabic: '^س',
    english: ['will'],
    description: 'will (future)',
    type: 'prefix',
    priority: 80,
  },
  // Negation with preposition
  {
    arabic: '^بل',
    english: ['but', 'rather'],
    description: 'but/rather',
    type: 'prefix',
    priority: 75,
  },
];

/**
 * Arabic suffixes with their English equivalents
 */
export const ARABIC_SUFFIXES: WordComponent[] = [
  // Pronouns - possessive
  {
    arabic: 'ي$',
    english: ['my', 'mine'],
    description: 'my',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'ك$',
    english: ['your', 'yours'],
    description: 'your (masc.)',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'كِ$',
    english: ['your', 'yours'],
    description: 'your (fem.)',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'ه$',
    english: ['his', 'its'],
    description: 'his/its',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'ها$',
    english: ['her', 'hers', 'its'],
    description: 'her/its',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'نا$',
    english: ['our', 'ours'],
    description: 'our',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'كم$',
    english: ['your', 'yours'],
    description: 'your (plural)',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'هم$',
    english: ['their', 'theirs'],
    description: 'their (masc.)',
    type: 'suffix',
    priority: 100,
  },
  {
    arabic: 'هن$',
    english: ['their', 'theirs'],
    description: 'their (fem.)',
    type: 'suffix',
    priority: 100,
  },
  // Dual and plural markers
  {
    arabic: 'ان$',
    english: ['two', 'both'],
    description: 'dual',
    type: 'suffix',
    priority: 90,
  },
  {
    arabic: 'ين$',
    english: ['two', 'both'],
    description: 'dual (genitive)',
    type: 'suffix',
    priority: 90,
  },
  {
    arabic: 'ون$',
    english: ['they', 'those who'],
    description: 'masculine plural',
    type: 'suffix',
    priority: 85,
  },
  {
    arabic: 'ات$',
    english: ['feminine plural', 'times'],
    description: 'feminine plural',
    type: 'suffix',
    priority: 85,
  },
  // Case endings (simplified)
  {
    arabic: 'ة$',
    english: ['feminine marker'],
    description: 'feminine',
    type: 'suffix',
    priority: 70,
  },
];

/**
 * Common Arabic words that are frequently standalone
 */
export const ARABIC_COMMON_WORDS: WordComponent[] = [
  // Articles and demonstratives
  {
    arabic: '^هذا$',
    english: ['this'],
    description: 'this (masc.)',
    type: 'common_word',
    priority: 100,
  },
  {
    arabic: '^هذه$',
    english: ['this'],
    description: 'this (fem.)',
    type: 'common_word',
    priority: 100,
  },
  {
    arabic: '^ذلك$',
    english: ['that'],
    description: 'that (masc.)',
    type: 'common_word',
    priority: 100,
  },
  {
    arabic: '^تلك$',
    english: ['that'],
    description: 'that (fem.)',
    type: 'common_word',
    priority: 100,
  },
  // Particles
  {
    arabic: '^و$',
    english: ['and'],
    description: 'and',
    type: 'particle',
    priority: 95,
  },
  {
    arabic: '^أو$',
    english: ['or'],
    description: 'or',
    type: 'particle',
    priority: 95,
  },
  {
    arabic: '^لا$',
    english: ['no', 'not'],
    description: 'no/not',
    type: 'particle',
    priority: 95,
  },
  {
    arabic: '^ما$',
    english: ['what', 'not'],
    description: 'what/not',
    type: 'particle',
    priority: 90,
  },
  {
    arabic: '^لم$',
    english: ['did not', 'not'],
    description: 'did not',
    type: 'particle',
    priority: 90,
  },
  {
    arabic: '^لن$',
    english: ['will not', 'not'],
    description: 'will not',
    type: 'particle',
    priority: 90,
  },
  // Question words
  {
    arabic: '^من$',
    english: ['who', 'whom'],
    description: 'who',
    type: 'common_word',
    priority: 90,
  },
  {
    arabic: '^ماذا$',
    english: ['what'],
    description: 'what',
    type: 'common_word',
    priority: 90,
  },
  {
    arabic: '^أين$',
    english: ['where'],
    description: 'where',
    type: 'common_word',
    priority: 90,
  },
  {
    arabic: '^متى$',
    english: ['when'],
    description: 'when',
    type: 'common_word',
    priority: 90,
  },
  {
    arabic: '^كيف$',
    english: ['how'],
    description: 'how',
    type: 'common_word',
    priority: 90,
  },
  {
    arabic: '^لماذا$',
    english: ['why'],
    description: 'why',
    type: 'common_word',
    priority: 90,
  },
  // Common verbs (to be expanded)
  {
    arabic: '^كان$',
    english: ['was', 'were'],
    description: 'was/were',
    type: 'common_word',
    priority: 85,
  },
  {
    arabic: '^يكون$',
    english: ['is', 'will be'],
    description: 'is/will be',
    type: 'common_word',
    priority: 85,
  },
  // Additional common words for testing
  {
    arabic: '^البيت$',
    english: ['the house'],
    description: 'the house',
    type: 'common_word',
    priority: 80,
  },
  {
    arabic: '^وأنا$',
    english: ['and I'],
    description: 'and I',
    type: 'common_word',
    priority: 80,
  },
  // Prepositions as standalone words
  {
    arabic: '^في$',
    english: ['in', 'at'],
    description: 'in/at',
    type: 'common_word',
    priority: 80,
  },
  {
    arabic: '^من$',
    english: ['from', 'of'],
    description: 'from/of',
    type: 'common_word',
    priority: 80,
  },
  {
    arabic: '^إلى$',
    english: ['to', 'towards'],
    description: 'to/towards',
    type: 'common_word',
    priority: 80,
  },
  {
    arabic: '^على$',
    english: ['on', 'upon'],
    description: 'on/upon',
    type: 'common_word',
    priority: 80,
  },
];

/**
 * All word components combined and sorted by priority
 */
export const ALL_WORD_COMPONENTS: WordComponent[] = [
  ...ARABIC_PREFIXES,
  ...ARABIC_SUFFIXES,
  ...ARABIC_COMMON_WORDS,
].sort((a, b) => b.priority - a.priority);

/**
 * Component types with their display properties
 * Uses official app colors for consistency
 */
export const COMPONENT_TYPE_CONFIG = {
  prefix: {
    label: 'Prefix',
    colorName: 'tint' as const, // Primary tint color
    icon: '→',
  },
  suffix: {
    label: 'Suffix',
    colorName: 'error' as const, // Error color for suffixes
    icon: '←',
  },
  common_word: {
    label: 'Word',
    colorName: 'success' as const, // Success color for complete words
    icon: '●',
  },
  particle: {
    label: 'Particle',
    colorName: 'warning' as const, // Warning color for particles
    icon: '◆',
  },
} as const;
