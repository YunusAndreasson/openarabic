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
  /** Type of component */
  type: 'prefix' | 'suffix';
}

/**
 * Arabic prefixes with their English equivalents
 */
export const ARABIC_PREFIXES: WordComponent[] = [
  // Definite article
  {
    arabic: '^ال',
    english: ['the'],
    type: 'prefix',
  },
  // Flexible definite article (can appear after other prefixes)
  {
    arabic: 'ال',
    english: ['the'],
    type: 'prefix',
  },
  // Prepositions
  {
    arabic: '^ب',
    english: ['with', 'by', 'in'],
    type: 'prefix',
  },
  {
    arabic: '^ل',
    english: ['to', 'for'],
    type: 'prefix',
  },
  {
    arabic: '^ك',
    english: ['like', 'as'],
    type: 'prefix',
  },
  {
    arabic: '^في',
    english: ['in', 'at'],
    type: 'prefix',
  },
  // Flexible في (can appear after other prefixes)
  {
    arabic: 'في',
    english: ['in', 'at'],
    type: 'prefix',
  },
  {
    arabic: '^من',
    english: ['from', 'of'],
    type: 'prefix',
  },
  {
    arabic: '^إلى',
    english: ['to', 'towards'],
    type: 'prefix',
  },
  {
    arabic: '^على',
    english: ['on', 'upon'],
    type: 'prefix',
  },
  {
    arabic: '^عن',
    english: ['about', 'from', 'concerning'],
    type: 'prefix',
  },
  // Conjunctions
  {
    arabic: '^و',
    english: ['and'],
    type: 'prefix',
  },
  {
    arabic: '^ف',
    english: ['so', 'then'],
    type: 'prefix',
  },
  // Future tense marker
  {
    arabic: '^س',
    english: ['will'],
    type: 'prefix',
  },
  // Negation with preposition
  {
    arabic: '^بل',
    english: ['but', 'rather'],
    type: 'prefix',
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
    type: 'suffix',
  },
  {
    arabic: 'ك$',
    english: ['your', 'yours'],
    type: 'suffix',
  },
  {
    arabic: 'كِ$',
    english: ['your', 'yours'],
    type: 'suffix',
  },
  {
    arabic: 'ه$',
    english: ['his', 'its', 'it'],
    type: 'suffix',
  },
  {
    arabic: 'ها$',
    english: ['her', 'hers', 'its', 'them', 'it'],
    type: 'suffix',
  },
  {
    arabic: 'نا$',
    english: ['our', 'ours'],
    type: 'suffix',
  },
  {
    arabic: 'كم$',
    english: ['your', 'yours'],
    type: 'suffix',
  },
  {
    arabic: 'هم$',
    english: ['their', 'theirs', 'them'],
    type: 'suffix',
  },
  {
    arabic: 'هن$',
    english: ['their', 'theirs'],
    type: 'suffix',
  },
  // Dual and plural markers
  {
    arabic: 'ان$',
    english: ['two', 'both'],
    type: 'suffix',
  },
  {
    arabic: 'ين$',
    english: ['two', 'both'],
    type: 'suffix',
  },
  {
    arabic: 'ون$',
    english: ['they', 'those who'],
    type: 'suffix',
  },
  {
    arabic: 'ات$',
    english: ['feminine plural', 'times'],
    type: 'suffix',
  },
  // Case endings (simplified)
  {
    arabic: 'ة$',
    english: ['feminine marker'],
    type: 'suffix',
  },
];

/**
 * Component types with their display properties
 * Uses official app colors for consistency
 */
export const COMPONENT_TYPE_CONFIG = {
  prefix: {
    label: 'Prefix',
    colorName: 'tint' as const, // Primary tint color (sage green)
    icon: '→',
  },
  suffix: {
    label: 'Suffix',
    colorName: 'warning' as const, // Warning color for better contrast in both light and dark modes
    icon: '←',
  },
} as const;
