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
  { arabic: 'و', english: ['and', 'also', 'plus', 'along with', 'while', 'by'] }, // 'by' for oaths (e.g., "by Allah")
  { arabic: 'ف', english: ['so', 'then', 'thus', 'therefore', 'consequently', 'and', 'for', 'about', 'but'] }, // 'about' for interrogatives like "what about", 'but' for adversative uses
];

const BASE_PREPOSITIONS = [
  {
    arabic: 'ب',
    english: ['with', 'by', 'in', 'via', 'through', 'using', 'according to', 'of', 'for', 'at', 'concerning', 'based'],
  },
  { arabic: 'ل', english: ['to', 'for', 'toward', 'because of', 'in order to', 'of'] },
  { arabic: 'ك', english: ['like', 'as', 'such as', 'similar to'] },
  { arabic: 'في', english: ['in', 'at', 'inside', 'within', 'upon'] },
  { arabic: 'من', english: ['from', 'of', 'than', 'out of'] },
  { arabic: 'على', english: ['on', 'upon', 'over', 'above', 'against', 'to'] }, // 'to' for obligation/direction
  { arabic: 'عن', english: ['about', 'from', 'concerning', 'regarding'] },
  { arabic: 'إلى', english: ['to', 'towards', 'into', 'until'] },
];

const DEFINITE_ARTICLE = { arabic: 'ال', english: ['the'] };

// 2. Other standalone prefixes
const OTHER_PREFIXES = [
  // Future tense markers
  { arabic: 'س', english: ['will', 'shall'] },
  { arabic: 'سوف', english: ['will', 'shall'] },
  // Negation particles
  { arabic: 'لا', english: ['not', 'no', "don't", "doesn't", "didn't", 'do not'] },
  { arabic: 'لم', english: ['did not', "didn't", 'does not', "doesn't"] },
  { arabic: 'لن', english: ['will not', 'shall not', 'never', "won't"] },
  { arabic: 'إلا', english: ['except', 'but', 'only', 'none', 'nothing but'] },
  { arabic: 'بل', english: ['but', 'rather', 'instead'] },
  { arabic: 'ثم', english: ['then', 'and then', 'afterwards', 'moreover'] },
  // Verbal subject markers (present tense)
  { arabic: 'ي', english: ['he', 'it', 'was', 'is', 'does'] }, // broader auxiliaries for gating
  { arabic: 'ت', english: ['you', 'she', 'does', 'is'] },
  { arabic: 'أ', english: ['I', 'do', 'am'] },
  { arabic: 'ن', english: ['we', 'are', 'do'] },
  // Subjunctive prefix (ya + verb + tu = "to verb")
  { arabic: 'ي', english: ['to'] }, // subjunctive marker for "to [verb]"
  // Aspect particles & common compounds
  { arabic: 'قد', english: ['already', 'indeed', 'used to', 'sometimes'] },
  { arabic: 'إن', english: ['indeed', 'verily', 'if'] },
  { arabic: 'فإن', english: ['for', 'so', 'then', 'therefore', 'because'] }, // Compound: fa (so/then) + inna (emphasis)
  { arabic: 'إنما', english: ['only', 'truly', 'verily', 'indeed'] }, // Restrictive particle
  { arabic: 'ما', english: ['what', 'that which'] },
  { arabic: 'مَنْ', english: ['who', 'whoever', 'whomever', 'he who', 'those who'] },
  { arabic: 'أن', english: ['that', 'to'] },
  { arabic: 'إذا', english: ['if', 'when'] },
  { arabic: 'كم', english: ['how much', 'how many', 'how'] },
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

  // Conjunction + Particle (common discourse particles)
  const PARTICLES: { arabic: string; english: string[] }[] = [
    { arabic: 'قد', english: ['already', 'indeed'] },
    { arabic: 'لا', english: ['not', 'no'] },
    { arabic: 'ما', english: ['what', 'that which'] },
    { arabic: 'أن', english: ['that', 'to'] },
    { arabic: 'إذا', english: ['when', 'if'] },
    { arabic: 'من', english: ['who', 'whoever', 'whomever'] }, // Added for فمن compound
    { arabic: 'إنما', english: ['only', 'truly', 'verily', 'indeed'] }, // Added for فإنما compound
  ];
  for (const conj of BASE_CONJUNCTIONS) {
    for (const particle of PARTICLES) {
      combinations.push({
        arabic: `^${conj.arabic}${particle.arabic}`,
        english: combineEnglish([conj.english[0] ?? ''], particle.english),
        type: ComponentType.PREFIX,
      });
    }
  }

  return combinations;
}

/**
 * Enhances programmatically generated combinations with translation style variations.
 * Translators often drop conjunctions or use possessive interpretations, so we add
 * these alternatives to the existing patterns to avoid duplicates.
 */
function enhanceWithTranslationVariations(combinations: WordComponent[]): WordComponent[] {
  const possessives = ['his', 'her', 'their', 'my', 'your', 'its'];
  const theVariation = ['the', ...possessives];

  return combinations.map(comp => {
    // Enhance و+ال: add "the" (dropped "and") and possessives
    if (comp.arabic === '^وال') {
      return { ...comp, english: [...comp.english, ...theVariation] };
    }
    // Enhance ف+ال: add "the" (dropped "so/then") and possessives
    if (comp.arabic === '^فال') {
      return { ...comp, english: [...comp.english, ...theVariation] };
    }
    // Enhance و+ب+ال: add possessive interpretations
    if (comp.arabic === '^وبال') {
      return { ...comp, english: [...comp.english, ...possessives] };
    }
    // Enhance ف+ب+ال: add possessive interpretations
    if (comp.arabic === '^فبال') {
      return { ...comp, english: [...comp.english, ...possessives] };
    }
    // Enhance ولا: add "do not" (dropped "and" from "and not")
    if (comp.arabic === '^ولا') {
      return { ...comp, english: [...comp.english, 'do not', "don't"] };
    }
    return comp;
  });
}

/**
 * Create the final list of all prefixes for export.
 */
function createFinalPrefixList(): WordComponent[] {
  // 1. Start with generated combinations and enhance them with translation variations
  const combinations = enhanceWithTranslationVariations(generatePrefixCombinations());

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
  // Including possessive interpretations where translators use "his/her/their" instead of "with/by/for the"
  const prepPlusAl: WordComponent[] = [
    {
      arabic: '^بال',
      english: ['with the', 'in the', 'by the', 'his', 'her', 'their', 'my', 'your', 'its'],
      type: ComponentType.PREFIX
    },
    {
      arabic: '^لل',
      english: ['for the', 'to the', 'his', 'her', 'their', 'my', 'your', 'its'],
      type: ComponentType.PREFIX
    },
    { arabic: '^كال', english: ['like the', 'as the'], type: ComponentType.PREFIX },
  ];

  // 5. Add من particle compounds (من as "who/whoever", not preposition "from")
  // Note: من also exists as preposition "from" in BASE_PREPOSITIONS, creating compounds like فمن="so from"
  // These entries provide the particle meaning "who/whoever" which has higher priority due to longer match
  const manParticleCompounds: WordComponent[] = [
    { arabic: '^فمن', english: ['so whoever', 'then whoever', 'so who', 'then who', 'and whoever', 'and who'], type: ComponentType.PREFIX },
    { arabic: '^ومن', english: ['and whoever', 'and who', 'also whoever', 'also who'], type: ComponentType.PREFIX },
  ];

  // 6. Add إنما particle compounds (stylistic translations often omit conjunction in English)
  const innamaCompounds: WordComponent[] = [
    { arabic: '^فإنما', english: ['so only', 'then only', 'so truly', 'then truly', 'only truly', 'only', 'truly'], type: ComponentType.PREFIX },
    { arabic: '^وإنما', english: ['and only', 'also only', 'and truly', 'also truly'], type: ComponentType.PREFIX },
  ];

  // 7. Add subject/future combined prefixes (double prefixes)
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

  // Note: Translation style variations (dropped conjunctions, possessive interpretations)
  // are now integrated into the patterns above via enhanceWithTranslationVariations()
  // and the extended prepPlusAl entries, eliminating duplicate pattern checks.

  return [...baseList, ...prepPlusAl, ...manParticleCompounds, ...innamaCompounds, ...subjectFutureCombos].sort(
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
    english: ['his', 'its', 'it', 'of him', 'him', 'himself', 'he', 'their'],
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
  // Subjunctive suffix (ya + verb + tu = "to verb")
  {
    arabic: 'تُ$',
    english: ['to'],
    type: ComponentType.SUFFIX,
  },
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
  // Conditional particle as suffix for compound words like فإن
  {
    arabic: 'إن$',
    english: ['if'],
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
    english: ['he', 'a', 'an', 'as', 'the'],
    type: ComponentType.DIACRITIC,
  },

  // Kasra (ــِ) - short "i" vowel, often indicates genitive case
  {
    arabic: 'ِ$', // Kasra at end of word
    english: ['in', 'of', 'with', 'the'],
    type: ComponentType.DIACRITIC,
  },

  // Damma (ــُ) - short "u" vowel, often indicates nominative case
  {
    arabic: 'ُ$', // Damma at end of word
    english: ['he', 'it', 'they', 'of'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Fath (ــًا) - nunation with fatha, indicates indefinite accusative
  {
    arabic: 'ًا$',
    english: ['an', 'as', 'a', 'one'],
    type: ComponentType.DIACRITIC,
  },

  // Standalone Tanween Fath (ــً) - without alif, common on taa marboota
  {
    arabic: 'ً$',
    english: ['a', 'an', 'one'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Kasr (ــٍ) - nunation with kasra, indicates indefinite genitive
  {
    arabic: 'ٍ$',
    english: ['of', 'in', 'at', 'a', 'something'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Damm (ــٌ) - nunation with damma, indicates indefinite nominative
  {
    arabic: 'ٌ$',
    english: ['a', 'an', 'is', 'the word', 'one'],
    type: ComponentType.DIACRITIC,
  },

  // Taa Marboota (ــتْ) - feminine past tense / passive marker
  {
    arabic: 'تْ$',
    english: ['was', 'did', 'has', 'have been', 'take', 'takes', 'becomes', 'is', 'it'],
    type: ComponentType.DIACRITIC,
  },

  // First person plural past tense (ــنَا) - "we did"
  {
    arabic: 'نَا$',
    english: ['we', 'we were', 'we did'],
    type: ComponentType.DIACRITIC,
  },

  // Dual subject marker (ــَا) - "they two" / dual
  {
    arabic: 'َا$',
    english: ['they', 'both', 'they said', 'they two'],
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
