/**
 * Ground Truth Test Cases for Grammar System Accuracy Benchmarking
 *
 * These test cases are manually verified to represent correct expected behavior.
 * Each case specifies what the system SHOULD detect, not what it currently does.
 *
 * Categories:
 * - prefix: Tests for prefix detection (conjunctions, prepositions, particles)
 * - suffix: Tests for suffix detection (possessives, verb conjugations)
 * - infix: Tests for infix detection (verb forms VII, VIII, X)
 * - combined: Tests for multiple components together
 * - none: Tests where NO components should be detected (root letters only)
 */

import type { GroundTruthCase } from '@/utils/benchmarkUtils';

/**
 * PREFIX TEST CASES
 * Tests detection of conjunctions, prepositions, articles, particles
 */
export const PREFIX_CASES: GroundTruthCase[] = [
  // Conjunction و (and)
  {
    arabic: 'والكتاب',
    english: 'and the book',
    expectedPrefixes: ['و', 'ال'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },
  {
    arabic: 'وكتب',
    english: 'and he wrote',
    expectedPrefixes: ['و'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Conjunction ف (so, then)
  {
    arabic: 'فقال',
    english: 'so he said',
    expectedPrefixes: ['ف'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Preposition ب (with, by)
  {
    arabic: 'بالكتاب',
    english: 'with the book',
    expectedPrefixes: ['ب', 'ال'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },
  {
    arabic: 'بالصدق',
    english: 'through honesty',
    expectedPrefixes: ['ب', 'ال'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Preposition ل (to, for)
  {
    arabic: 'للكتاب',
    english: 'for the book',
    expectedPrefixes: ['ل', 'ل'], // Double lam (ل + ال with elided alef)
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Preposition ك (like)
  {
    arabic: 'كالكتاب',
    english: 'like the book',
    expectedPrefixes: ['ك', 'ال'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Preposition في (in)
  {
    arabic: 'فيالبيت',
    english: 'in the house',
    expectedPrefixes: ['في'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Preposition من (from)
  {
    arabic: 'منهم',
    english: 'from them',
    expectedPrefixes: ['من'],
    expectedSuffix: 'هم',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Preposition على (on, upon)
  {
    arabic: 'عليك',
    english: 'on you',
    expectedPrefixes: ['علي'],
    expectedSuffix: 'ك',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Preposition عن (about, from)
  {
    arabic: 'عنه',
    english: 'about him',
    expectedPrefixes: ['عن'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Preposition مع (with)
  {
    arabic: 'معه',
    english: 'with him',
    expectedPrefixes: ['مع'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
  {
    arabic: 'معنا',
    english: 'with us',
    expectedPrefixes: ['مع'],
    expectedSuffix: 'نا',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Definite article ال (the)
  {
    arabic: 'الكتاب',
    english: 'the book',
    expectedPrefixes: ['ال'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Future tense س (will)
  {
    arabic: 'سيذهب',
    english: 'he will go',
    expectedPrefixes: ['س'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Future tense سوف (will)
  {
    arabic: 'سوفيذهب',
    english: 'he will go',
    expectedPrefixes: ['سوف'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Negation لا (not)
  {
    arabic: 'لايعرف',
    english: 'does not know',
    expectedPrefixes: ['لا'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Negation لم (did not)
  {
    arabic: 'لميفعل',
    english: 'did not do',
    expectedPrefixes: ['لم'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Particle قد (already)
  {
    arabic: 'قدفعل',
    english: 'already did',
    expectedPrefixes: ['قد'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Particle إن (indeed)
  {
    arabic: 'فإن',
    english: 'so indeed',
    expectedPrefixes: ['ف', 'إن'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
    note: 'Multi-prefix: conjunction + particle',
  },

  // Interrogative ما (what)
  {
    arabic: 'بما',
    english: 'concerning what',
    expectedPrefixes: ['ب', 'ما'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },

  // Interrogative من (who)
  {
    arabic: 'فمن',
    english: 'so whoever',
    expectedPrefixes: ['ف', 'من'],
    expectedSuffix: null,
    expectedHasComponents: true,
    category: 'prefix',
    source: 'test',
  },
];

/**
 * SUFFIX TEST CASES
 * Tests detection of possessive pronouns and verb conjugations
 */
export const SUFFIX_CASES: GroundTruthCase[] = [
  // Possessive ه (his, its)
  {
    arabic: 'كتابه',
    english: 'his book',
    expectedPrefixes: [],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Possessive ها (her, its)
  {
    arabic: 'كتابها',
    english: 'her book',
    expectedPrefixes: [],
    expectedSuffix: 'ها',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },
  {
    arabic: 'رآها',
    english: 'he sees it',
    expectedPrefixes: [],
    expectedSuffix: 'ها',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Possessive ي (my)
  {
    arabic: 'كتابي',
    english: 'my book',
    expectedPrefixes: [],
    expectedSuffix: 'ي',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },
  {
    arabic: 'يومي',
    english: 'my day',
    expectedPrefixes: [],
    expectedSuffix: 'ي',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Possessive ك (your)
  {
    arabic: 'كتابك',
    english: 'your book',
    expectedPrefixes: [],
    expectedSuffix: 'ك',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },
  {
    arabic: 'يومك',
    english: 'your day',
    expectedPrefixes: [],
    expectedSuffix: 'ك',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Possessive نا (our)
  {
    arabic: 'كتابنا',
    english: 'our book',
    expectedPrefixes: [],
    expectedSuffix: 'نا',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Possessive كم (your plural)
  {
    arabic: 'كتابكم',
    english: 'your book',
    expectedPrefixes: [],
    expectedSuffix: 'كم',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Possessive هم (their)
  {
    arabic: 'كتابهم',
    english: 'their book',
    expectedPrefixes: [],
    expectedSuffix: 'هم',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Object pronoun ني (me)
  {
    arabic: 'أخبرني',
    english: 'he told me',
    expectedPrefixes: [],
    expectedSuffix: 'ني',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Verb conjugation وا (they)
  {
    arabic: 'كتبوا',
    english: 'they wrote',
    expectedPrefixes: [],
    expectedSuffix: 'وا',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
  },

  // Dual + possessive compound
  {
    arabic: 'يديه',
    english: 'his hands',
    expectedPrefixes: [],
    expectedSuffix: 'يه',
    expectedHasComponents: true,
    category: 'suffix',
    source: 'test',
    note: 'Compound suffix: dual + possessive',
  },
];

/**
 * INFIX TEST CASES
 * Tests detection of verb form infixes
 */
export const INFIX_CASES: GroundTruthCase[] = [
  // Form VIII reflexive ت
  {
    arabic: 'اجتمع',
    english: 'they gathered together',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedInfix: 'ت',
    expectedHasComponents: true,
    category: 'infix',
    source: 'test',
  },

  // Form X seeking ست
  {
    arabic: 'استطاع',
    english: 'he sought to do',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedInfix: 'ست',
    expectedHasComponents: true,
    category: 'infix',
    source: 'test',
  },

  // Form VII passive ن
  {
    arabic: 'انكسر',
    english: 'it broke itself',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedInfix: 'ن',
    expectedHasComponents: true,
    category: 'infix',
    source: 'test',
  },
];

/**
 * COMBINED TEST CASES
 * Tests detection of multiple components together
 */
export const COMBINED_CASES: GroundTruthCase[] = [
  // Prefix + Suffix
  {
    arabic: 'وكتابه',
    english: 'and his book',
    expectedPrefixes: ['و'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
  {
    arabic: 'وبيتها',
    english: 'and her house',
    expectedPrefixes: ['و'],
    expectedSuffix: 'ها',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
  {
    arabic: 'وكتابته',
    english: 'and recording it',
    expectedPrefixes: ['و'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
  {
    arabic: 'بكتابي',
    english: 'with my book',
    expectedPrefixes: ['ب'],
    expectedSuffix: 'ي',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Multiple prefixes + Suffix
  {
    arabic: 'والكتابه',
    english: 'and his the book',
    expectedPrefixes: ['و', 'ال'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Preposition + Suffix (prep ends in ى → ي + suffix)
  {
    arabic: 'فيه',
    english: 'about it',
    expectedPrefixes: ['في'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
  {
    arabic: 'بها',
    english: 'with it',
    expectedPrefixes: ['ب'],
    expectedSuffix: 'ها',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
  {
    arabic: 'به',
    english: 'in it',
    expectedPrefixes: ['ب'],
    expectedSuffix: 'ه',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },

  // Prefix + plural suffix
  {
    arabic: 'ويكتبون',
    english: 'and they write',
    expectedPrefixes: ['و'],
    expectedSuffix: 'ون',
    expectedHasComponents: true,
    category: 'combined',
    source: 'test',
  },
];

/**
 * NONE TEST CASES
 * Tests where NO components should be detected (root letters only)
 * These test the system's ability to avoid false positives
 */
export const NONE_CASES: GroundTruthCase[] = [
  // Single English word - should never be colored
  {
    arabic: 'كتاب',
    english: 'book',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single-word rule: no coloring for single English words',
  },
  {
    arabic: 'بيت',
    english: 'house',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single-word rule',
  },
  {
    arabic: 'والبيت',
    english: 'house',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single-word rule - even though و exists, English is single word',
  },

  // ب as root letter (NOT prefix)
  {
    arabic: 'بيت',
    english: 'the House of',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ب is root letter in ب-ي-ت (house), NOT prefix',
  },
  {
    arabic: 'بصر',
    english: 'eyes of',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ب is root letter in ب-ص-ر (sight)',
  },
  {
    arabic: 'بلد',
    english: 'of the land',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ب is root letter in ب-ل-د (land)',
  },

  // ه as root letter (NOT suffix)
  {
    arabic: 'وجه',
    english: 'face',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ه is root letter in و-ج-ه (face)',
  },
  {
    arabic: 'فقيه',
    english: 'scholar',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ه is root letter - فعيل pattern (fa3eel adjective)',
  },
  {
    arabic: 'كره',
    english: 'hate',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ه is root letter in ك-ر-ه (hate)',
  },

  // ي as root letter (NOT suffix) - nisba adjectives
  {
    arabic: 'عربي',
    english: 'Arab',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ي is nisba suffix making adjective, single word',
  },

  // Short words where prefix would leave too little
  {
    arabic: 'يد',
    english: 'hand',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'ي is root letter - too short to split',
  },
  {
    arabic: 'ولد',
    english: 'boy',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single word - و is root letter in و-ل-د',
  },

  // Pure particle combinations - no root to show
  {
    arabic: 'وهو',
    english: 'and he',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Pure particle combination: conjunction + pronoun, no compositional insight',
  },
  {
    arabic: 'فهي',
    english: 'then she',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Pure particle combination: conjunction + pronoun',
  },

  // Single standalone particles (no composition to show)
  {
    arabic: 'لا',
    english: 'that does not',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single component - no composition to show',
  },
  {
    arabic: 'من',
    english: 'who',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single component - standalone particle',
  },
  {
    arabic: 'لم',
    english: 'does not',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single component - standalone negation',
  },
  {
    arabic: 'كم',
    english: 'how much',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Single component - standalone interrogative',
  },

  // Compound particles that should NOT be decomposed
  {
    arabic: 'لولا',
    english: 'if not for',
    expectedPrefixes: [],
    expectedSuffix: null,
    expectedHasComponents: false,
    category: 'none',
    source: 'test',
    note: 'Fossilized compound particle - should not be decomposed',
  },
];

/**
 * All ground truth cases combined
 */
export const ALL_GROUND_TRUTH_CASES: GroundTruthCase[] = [
  ...PREFIX_CASES,
  ...SUFFIX_CASES,
  ...INFIX_CASES,
  ...COMBINED_CASES,
  ...NONE_CASES,
];

/**
 * Get cases by category
 */
export function getCasesByCategory(category: GroundTruthCase['category']): GroundTruthCase[] {
  return ALL_GROUND_TRUTH_CASES.filter(c => c.category === category);
}

/**
 * Get statistics about the ground truth corpus
 */
export function getCorpusStats(): {
  total: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const c of ALL_GROUND_TRUTH_CASES) {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    const source = c.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  return {
    total: ALL_GROUND_TRUTH_CASES.length,
    byCategory,
    bySource,
  };
}
