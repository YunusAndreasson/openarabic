/**
 * Arabic Word Components - Prefixes, Suffixes, and Common Words
 *
 * This file defines comprehensive rules for analyzing Arabic words and their English translations
 * to help users understand word structure and component meanings.
 *
 * Note: All Arabic patterns are normalized (diacritics removed) during analysis,
 * so patterns should not include diacritical marks.
 */

/**
 * Component types enum for type safety
 */
export enum ComponentType {
  PREFIX = 'prefix',
  INFIX = 'infix',
  SUFFIX = 'suffix',
  DIACRITIC = 'diacritic',
}

export interface WordComponent {
  /** Arabic text pattern (regex) */
  arabic: string;
  /** English translation patterns that should contain this component */
  english: string[];
  /** Type of component */
  type: ComponentType;
}

/**
 * =================================================================================
 * SINGLE SOURCE OF TRUTH FOR PREFIXES
 *
 * All prefixes are defined here. The final exported list is generated from these
 * base components to ensure consistency and prevent duplication.
 * =================================================================================
 */

// 1. Base components for programmatic generation
const BASE_CONJUNCTIONS = [
  { arabic: 'و', english: ['and', 'also', 'plus', 'along with', 'while'] },
  { arabic: 'ف', english: ['so', 'then', 'thus', 'therefore', 'consequently'] },
];

const BASE_PREPOSITIONS = [
  { arabic: 'ب', english: ['with', 'by', 'in', 'via', 'through', 'using', 'according to'] },
  { arabic: 'ل', english: ['to', 'for', 'toward', 'because of', 'in order to', 'of'] },
  { arabic: 'ك', english: ['like', 'as', 'such as', 'similar to'] },
  { arabic: 'في', english: ['in', 'at', 'inside', 'within'] },
  { arabic: 'من', english: ['from', 'of', 'than', 'out of'] },
  { arabic: 'على', english: ['on', 'upon', 'over', 'above', 'against'] },
  { arabic: 'عن', english: ['about', 'from', 'concerning', 'regarding'] },
  { arabic: 'إلى', english: ['to', 'towards', 'into', 'until'] },
];

const DEFINITE_ARTICLE = { arabic: 'ال', english: ['the'] };

// 2. Other standalone prefixes not used in combinations
const OTHER_PREFIXES = [
  // Future tense markers
  { arabic: 'س', english: ['will', 'shall'] },
  { arabic: 'سوف', english: ['will', 'shall'] },
  // Negation particles
  { arabic: 'لا', english: ['not', 'no', "don't", "doesn't", "didn't"] },
  { arabic: 'لن', english: ['will not', 'shall not', 'never', "won't"] },
  { arabic: 'بل', english: ['but', 'rather', 'instead'] },
  // Verbal subject markers (present tense)
  { arabic: 'ي', english: ['he', 'it', 'was', 'is', 'does'] }, // broader auxiliaries for gating
  { arabic: 'ت', english: ['you', 'she', 'does', 'is'] },
  { arabic: 'أ', english: ['I', 'do', 'am'] },
  { arabic: 'ن', english: ['we', 'are', 'do'] },
  // Aspect particles & common compounds
  { arabic: 'قد', english: ['already', 'indeed'] },
  { arabic: 'إن', english: ['indeed', 'verily', 'if'] },
  { arabic: 'ما', english: ['what', 'that which'] },
  { arabic: 'أن', english: ['that', 'to'] },
  { arabic: 'إذا', english: ['if', 'when'] },
];

/**
 * =================================================================================
 * PROGRAMMATIC PREFIX GENERATION
 * =================================================================================
 */

/**
 * Generates English combinations from multiple arrays.
 */
function combineEnglish(...arrays: string[][]): string[] {
  if (arrays.length === 0 || !arrays[0]) {
    return [];
  }
  let result = arrays[0];
  for (let i = 1; i < arrays.length; i++) {
    const currentArray = arrays[i];
    if (!currentArray) continue;
    result = result.flatMap(a => currentArray.map(b => `${a} ${b}`));
  }
  return result;
}

/**
 * Generates valid Arabic prefix combinations programmatically.
 */
function generatePrefixCombinations(): WordComponent[] {
  const combinations: WordComponent[] = [];
  const allPrepositions = [...BASE_PREPOSITIONS, { arabic: 'في', english: ['in'] }];

  // Conjunction + Preposition
  for (const conj of BASE_CONJUNCTIONS) {
    for (const prep of allPrepositions) {
      combinations.push({
        arabic: `^${conj.arabic}${prep.arabic}`,
        english: combineEnglish([conj.english[0] ?? ''], prep.english),
        type: ComponentType.PREFIX,
      });
    }
  }

  // Conjunction + Preposition + Definite Article
  for (const conj of BASE_CONJUNCTIONS) {
    for (const prep of allPrepositions) {
      combinations.push({
        arabic: `^${conj.arabic}${prep.arabic}${DEFINITE_ARTICLE.arabic}`,
        english: combineEnglish([conj.english[0] ?? ''], prep.english, DEFINITE_ARTICLE.english),
        type: ComponentType.PREFIX,
      });
    }
  }

  // Conjunction + Definite Article
  for (const conj of BASE_CONJUNCTIONS) {
    combinations.push({
      arabic: `^${conj.arabic}${DEFINITE_ARTICLE.arabic}`,
      english: combineEnglish([conj.english[0] ?? ''], DEFINITE_ARTICLE.english),
      type: ComponentType.PREFIX,
    });
  }

  return combinations;
}

/**
 * Create the final list of all prefixes for export.
 */
function createFinalPrefixList(): WordComponent[] {
  // 1. Start with generated combinations
  const combinations = generatePrefixCombinations();

  // 2. Add all base prefixes as individual, anchored patterns
  const individualBasePrefixes = [
    ...BASE_CONJUNCTIONS,
    ...BASE_PREPOSITIONS,
    ...OTHER_PREFIXES,
  ].map(p => ({
    ...p,
    arabic: `^${p.arabic}`, // Ensure it's anchored at the start
    type: ComponentType.PREFIX,
  }));

  // 3. Add the flexible, un-anchored definite article for cases like 'وبال'
  const flexibleDefiniteArticle: WordComponent = {
    ...DEFINITE_ARTICLE,
    type: ComponentType.PREFIX,
  };

  const baseList: WordComponent[] = [
    ...combinations,
    ...individualBasePrefixes,
    flexibleDefiniteArticle,
    // Add flexible 'في' for rare cases like 'والفيالبيت'
    { arabic: 'في', english: ['in'], type: ComponentType.PREFIX },
  ];

  // 4. Add preposition + definite article combinations without conjunction
  const prepPlusAl: WordComponent[] = [
    { arabic: '^بال', english: ['with the', 'in the', 'by the'], type: ComponentType.PREFIX },
    { arabic: '^لل', english: ['for the', 'to the'], type: ComponentType.PREFIX },
    { arabic: '^كال', english: ['like the', 'as the'], type: ComponentType.PREFIX },
  ];

  // 5. Add subject/future combined prefixes (double prefixes)
  const subjectFutureCombos: WordComponent[] = [
    // Conjunction + subject marker
    { arabic: '^وي', english: ['and he', 'and it'], type: ComponentType.PREFIX },
    // ف (then/so) + subject marker
    {
      arabic: '^في',
      english: ['then he', 'so he', 'then it', 'so it'],
      type: ComponentType.PREFIX,
    },
    // س (will) + subject marker
    { arabic: '^سي', english: ['he will', 'it will'], type: ComponentType.PREFIX },
    // ف + س + ي (then/so he will)
    {
      arabic: '^فسي',
      english: ['then he will', 'so he will', 'then it will', 'so it will'],
      type: ComponentType.PREFIX,
    },
    // و + سوف (and will)
    {
      arabic: '^وسوف',
      english: ['and will', 'and he will', 'and it will'],
      type: ComponentType.PREFIX,
    },
    // ف + سوف (then/so will)
    {
      arabic: '^فسوف',
      english: ['then will', 'so will', 'then he will', 'so he will', 'then it will', 'so it will'],
      type: ComponentType.PREFIX,
    },
    // و + لن (and will not)
    { arabic: '^ولن', english: ['and will not', "and won't"], type: ComponentType.PREFIX },
    // ف + لن (then/so will not)
    {
      arabic: '^فلن',
      english: ['then will not', 'so will not', "then won't", "so won't"],
      type: ComponentType.PREFIX,
    },
  ];

  return [...baseList, ...prepPlusAl, ...subjectFutureCombos].sort(
    (a, b) => b.arabic.length - a.arabic.length
  ); // Sort longest first
}

/**
 * Complete Arabic prefixes, programmatically generated and sorted for optimal matching.
 */
export const ARABIC_PREFIXES: WordComponent[] = createFinalPrefixList();

/**
 * Arabic infixes with their English equivalents
 * These are morphological elements that appear within the root structure
 */
export const ARABIC_INFIXES: WordComponent[] = [
  // Form VIII reflexive/reciprocal infix ت
  {
    arabic: 'ت',
    english: ['self', 'each other', 'mutually', 'reciprocally', 'together'],
    type: ComponentType.INFIX,
  },

  // Form VII passive/reflexive infix ن
  {
    arabic: 'ن',
    english: ['self', 'itself', 'automatically', 'spontaneously'],
    type: ComponentType.INFIX,
  },

  // Form X seeking/requesting infix ست
  {
    arabic: 'ست',
    english: ['seek', 'request', 'ask for', 'try to', 'attempt to'],
    type: ComponentType.INFIX,
  },

  // Form IV causative infix أ (when internal)
  {
    arabic: 'أ',
    english: ['make', 'cause', 'let', 'allow', 'enable'],
    type: ComponentType.INFIX,
  },

  // Intensive/repetitive infix patterns
  {
    arabic: 'رر',
    english: ['repeatedly', 'again and again', 'continuously'],
    type: ComponentType.INFIX,
  },
  {
    arabic: 'لل',
    english: ['repeatedly', 'continuously', 'persistently'],
    type: ComponentType.INFIX,
  },

  // Diminutive infix patterns (common in classical Arabic)
  {
    arabic: 'ي',
    english: ['little', 'small', 'dear', 'beloved'],
    type: ComponentType.INFIX,
  },

  // Comparative/superlative infix أ (when internal, different from causative)
  {
    arabic: 'أع',
    english: ['more', 'most', 'greater', 'superior'],
    type: ComponentType.INFIX,
  },
];

/**
 * Arabic suffixes with their English equivalents
 */
export const ARABIC_SUFFIXES: WordComponent[] = [
  // Pronouns - possessive (normalized, no diacritics)
  {
    arabic: 'ي$',
    english: ['my', 'mine', 'of me'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ك$',
    english: ['your', 'yours', 'of you', 'you'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ه$',
    english: ['his', 'its', 'it', 'of him', 'him', 'himself', 'he'],
    type: ComponentType.SUFFIX,
  },
  // Object pronoun - me
  {
    arabic: 'ني$',
    english: ['me', 'my', 'of me'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ها$',
    english: ['her', 'hers', 'its', 'it', 'of her', 'their'],
    type: ComponentType.SUFFIX,
  },
  // Common transliteration-equivalent: final "هِ" often maps to "it/its"; we already catch via 'ه$'
  // Keep 'it/its' present for 'ه$' to handle cases like "...هِ"
  {
    arabic: 'نا$',
    english: ['our', 'ours', 'of us', 'us'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'كم$',
    english: ['your', 'yours', 'you all', 'you'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هم$',
    english: ['their', 'theirs', 'them'],
    type: ComponentType.SUFFIX,
  },
  // Dual possessive/object pronouns
  {
    arabic: 'كما$',
    english: ['you two', 'both of you', 'your (dual)'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هما$',
    english: ['both of them', 'their (dual)', 'them two'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هن$',
    english: ['their', 'theirs', 'them'],
    type: ComponentType.SUFFIX,
  },

  // Perfect tense subject endings
  {
    arabic: 'ت$',
    english: ['I', 'you'],
    type: ComponentType.SUFFIX,
  },

  // Common plural verbal/pronoun endings
  {
    arabic: 'وا$',
    english: ['they', 'them', 'they did'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تم$',
    english: ['you', 'you all', 'you did'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'كن$',
    english: ['you', 'you all', 'you were'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تن$',
    english: ['you', 'you all'],
    type: ComponentType.SUFFIX,
  },

  // Dual & plural markers - only include plausible word equivalents
  {
    arabic: 'ان$',
    english: ['two', 'both'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ين$',
    english: ['two', 'both'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ون$',
    english: ['they', 'those who'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ات$',
    english: ['times', 'instances'],
    type: ComponentType.SUFFIX,
  },
];

/**
 * Arabic diacritics with their English equivalents
 * These are vowel markings and grammatical indicators
 */
export const ARABIC_DIACRITICS: WordComponent[] = [
  // Fatha (ــَ) - short "a" vowel, often indicates accusative case or adverbial usage
  {
    arabic: 'َ$', // Fatha at end of word
    english: ['he', 'a', 'an', 'as'],
    type: ComponentType.DIACRITIC,
  },

  // Kasra (ــِ) - short "i" vowel, often indicates genitive case
  {
    arabic: 'ِ$', // Kasra at end of word
    english: ['in', 'of', 'with'],
    type: ComponentType.DIACRITIC,
  },

  // Damma (ــُ) - short "u" vowel, often indicates nominative case
  {
    arabic: 'ُ$', // Damma at end of word
    english: ['he', 'it', 'they'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Fath (ــًا) - nunation with fatha, indicates indefinite accusative
  {
    arabic: 'ًا$',
    english: ['an', 'as', 'a'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Kasr (ــٍ) - nunation with kasra, indicates indefinite genitive
  {
    arabic: 'ٍ$',
    english: ['of', 'in', 'at'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Damm (ــٌ) - nunation with damma, indicates indefinite nominative
  {
    arabic: 'ٌ$',
    english: ['a', 'an'],
    type: ComponentType.DIACRITIC,
  },
];

/**
 * Component types with their display properties
 * Uses official app colors for consistency
 */
export const COMPONENT_TYPE_CONFIG = {
  [ComponentType.PREFIX]: {
    label: 'Prefix',
    colorName: 'tint' as const, // Primary tint color (sage green)
    icon: '→',
  },
  [ComponentType.INFIX]: {
    label: 'Infix',
    colorName: 'primary' as const, // Primary color for distinction from prefix/suffix
    icon: '↔',
  },
  [ComponentType.SUFFIX]: {
    label: 'Suffix',
    colorName: 'warning' as const, // Warning color for better contrast in both light and dark modes
    icon: '←',
  },
  [ComponentType.DIACRITIC]: {
    label: 'Diacritic',
    colorName: 'secondaryText' as const, // Medium sage color for subtle but visible marking
    icon: '◌',
  },
} as const;
