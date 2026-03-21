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
export const ComponentType = {
  PREFIX: 'prefix',
  INFIX: 'infix',
  SUFFIX: 'suffix',
  DIACRITIC: 'diacritic',
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

/**
 * Grammatical roles for components - used for color differentiation and educational value
 * Using const object for zero runtime overhead
 */
export const GrammaticalRole = {
  CONJUNCTION: 'conjunction', // و, ف - connecting words/clauses
  DEFINITE_ARTICLE: 'article', // ال - the
  PREPOSITION: 'preposition', // ب, ل, ك, في, من, على, عن, إلى - with, to, like, in, from, on, about, to
  SUBJECT_PREFIX: 'subject', // ت, ي, ن, أ - verb conjugation markers (you, he, we, I)
  FUTURE_TENSE: 'future', // س, سوف - will/shall
  NEGATION: 'negation', // لا, لم, لن, لئلا, إلا, بل - not, no, except
  PARTICLE: 'particle', // قد, إن, فإن, إنما, أما, أن, إذا, ثم - various grammatical particles
  INTERROGATIVE: 'interrogative', // ما, من, كم - what, who, how (question words)
  POSSESSIVE: 'possessive', // ي, ك, ه, ها, نا, كم, هم, هن - my, your, his, her, our, their
  PLURAL: 'plural', // ون, ين, ات - plural markers
  VERB_CONJUGATION: 'verb', // ت, وا, تم, تن, كن - perfect tense verb endings (I, you, they)
  DEMONSTRATIVE: 'demonstrative', // هذا, هذه, ذلك, تلك - this, that (pointing words)
  CASE_ENDING: 'case', // ُ, َ, ِ - nominative, accusative, genitive diacritics
  GENERIC: 'generic', // Fallback for unclassified components
} as const;

export type GrammaticalRole = (typeof GrammaticalRole)[keyof typeof GrammaticalRole];

export interface WordComponent {
  /** Arabic text pattern (regex) */
  arabic: string;
  /** English translation patterns that should contain this component */
  english: string[];
  /** Type of component */
  type: ComponentType;
  /** Grammatical role for color assignment and educational clarity */
  role: GrammaticalRole;
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
  {
    arabic: 'و',
    english: ['and', 'also', 'plus', 'along with', 'while', 'by'],
    role: GrammaticalRole.CONJUNCTION,
  }, // 'by' for oaths (e.g., "by Allah")
  {
    arabic: 'ف',
    english: ['so', 'then', 'thus', 'therefore', 'consequently', 'for', 'about', 'but'],
    role: GrammaticalRole.CONJUNCTION,
  }, // Conjunction with consequential/sequential meaning (different color from simple conjunction و)
  // Note: "and" removed from ف to prevent false positives when و already matches "and"
];

const BASE_PREPOSITIONS = [
  {
    arabic: 'ب',
    english: [
      'with',
      'by',
      'in',
      'via',
      'through',
      'using',
      'according to',
      // NOTE: 'of' removed - it comes from genitive case (إضافة), not from ب prefix
      // This prevents false positives like بَيْت → "house of" where ب is a root letter
      'for',
      'at',
      'concerning',
      'based',
      'as',
    ],
    role: GrammaticalRole.PREPOSITION,
  },
  {
    arabic: 'ل',
    english: ['to', 'for', 'toward', 'because of', 'in order to', 'of'],
    role: GrammaticalRole.PREPOSITION,
  },
  {
    arabic: 'ك',
    english: ['like', 'as', 'such as', 'similar to'],
    role: GrammaticalRole.PREPOSITION,
  },
  {
    arabic: 'في',
    english: ['in', 'at', 'inside', 'within', 'upon', 'about'], // 'about' added for contexts like فيه = "about it"
    role: GrammaticalRole.PREPOSITION,
  },
  { arabic: 'من', english: ['from', 'of', 'than', 'out of'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'م', english: ['from', 'of', 'for'], role: GrammaticalRole.PREPOSITION }, // Shortened form in contractions (من + من → مِمَّن → normalized: م + من, مما → "for what")
  {
    arabic: 'على',
    english: ['on', 'upon', 'over', 'above', 'against', 'to', 'in'],
    role: GrammaticalRole.PREPOSITION,
  }, // 'to' for obligation/direction, 'in' for certain contexts
  { arabic: 'علي', english: ['on', 'upon', 'in', 'to'], role: GrammaticalRole.PREPOSITION }, // Form with suffix (على + ه → عليه): alef maksura ى → yeh ي before pronoun suffixes. Inherits 'to' from على
  { arabic: 'عل', english: ['on', 'upon', 'to'], role: GrammaticalRole.PREPOSITION }, // Shortened form before possessive suffixes (على + ي → عليّ → normalized: عل + ي)
  {
    arabic: 'عن',
    english: ['about', 'from', 'concerning', 'regarding'],
    role: GrammaticalRole.PREPOSITION,
  },
  {
    arabic: 'عند',
    english: ['at', 'with', 'near', 'within', 'according to'],
    role: GrammaticalRole.PREPOSITION,
  }, // 'according to' added for interpretive translations like عِنْدَ → "according to"
  { arabic: 'إلى', english: ['to', 'towards', 'into', 'until'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'إلي', english: ['to', 'towards'], role: GrammaticalRole.PREPOSITION }, // Form before pronoun suffixes (إلى + ه → إليه)
  { arabic: 'إل', english: ['to', 'towards'], role: GrammaticalRole.PREPOSITION }, // Shortened form before possessive suffixes (إلى + ي → إليّ → normalized: إل + ي)
  { arabic: 'لدى', english: ['with', 'at', 'by', 'near'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'لدي', english: ['with', 'at'], role: GrammaticalRole.PREPOSITION }, // Form before pronoun suffixes (لدى + ه → لديه)
  { arabic: 'لد', english: ['with', 'at'], role: GrammaticalRole.PREPOSITION }, // Shortened form before possessive suffixes (لدى + ي → لديّ → normalized: لد + ي)
  {
    arabic: 'مع',
    english: ['with', 'together with', 'alongside', 'along with'],
    role: GrammaticalRole.PREPOSITION,
  },
  // Note: ما moved to OTHER_PREFIXES to avoid compound generation (وما, فما)
];

const DEFINITE_ARTICLE = { arabic: 'ال', english: ['the'], role: GrammaticalRole.DEFINITE_ARTICLE };

//  2. Other standalone prefixes
const OTHER_PREFIXES = [
  // Future tense markers
  { arabic: 'س', english: ['will', 'shall'], role: GrammaticalRole.FUTURE_TENSE },
  { arabic: 'سوف', english: ['will', 'shall'], role: GrammaticalRole.FUTURE_TENSE },
  // Negation particles
  {
    arabic: 'لا',
    english: ['not', 'no', "don't", "doesn't", "didn't", 'do not'],
    role: GrammaticalRole.NEGATION,
  },
  {
    arabic: 'لم',
    english: ['did not', "didn't", 'does not', "doesn't"],
    role: GrammaticalRole.NEGATION,
  },
  {
    arabic: 'لن',
    english: ['will not', 'shall not', 'never', "won't"],
    role: GrammaticalRole.NEGATION,
  },
  {
    arabic: 'لئلا',
    english: ['to not', 'lest', 'so that not', 'in order not to'],
    role: GrammaticalRole.NEGATION,
  }, // Compound negation particle
  {
    arabic: 'لولا',
    english: ['if not for', 'were it not for', 'if it were not for'],
    role: GrammaticalRole.PARTICLE,
  }, // Compound conditional particle (historically لَوْ + لَا, but fossilized - cannot be decomposed)
  {
    arabic: 'إلا',
    english: ['except', 'but', 'only', 'none', 'nothing but'],
    role: GrammaticalRole.NEGATION,
  },
  { arabic: 'بل', english: ['but', 'rather', 'instead'], role: GrammaticalRole.CONJUNCTION },
  {
    arabic: 'ثم',
    english: ['then', 'and then', 'afterwards', 'moreover'],
    role: GrammaticalRole.CONJUNCTION,
  }, // Actually a conjunction
  // Verbal subject markers (present tense)
  {
    arabic: 'ي',
    english: ['he', 'it', 'was', 'is', 'does', 'to'],
    role: GrammaticalRole.SUBJECT_PREFIX,
  }, // broader auxiliaries for gating, includes subjunctive 'to'
  {
    arabic: 'ت',
    english: ['you', 'she', 'it', 'does', 'is', 'to'],
    role: GrammaticalRole.SUBJECT_PREFIX,
  }, // 'it' for 3rd person feminine singular; 'to' for subjunctive (أن تفعل → "to do")
  { arabic: 'أ', english: ['I', 'do', 'am'], role: GrammaticalRole.SUBJECT_PREFIX },
  { arabic: 'ن', english: ['we', 'are', 'do'], role: GrammaticalRole.SUBJECT_PREFIX },
  // Aspect particles & common compounds
  {
    arabic: 'قد',
    english: ['already', 'indeed', 'used to', 'sometimes'],
    role: GrammaticalRole.PARTICLE,
  },
  { arabic: 'إن', english: ['indeed', 'verily', 'if'], role: GrammaticalRole.PARTICLE },
  // Note: "فإن" compound removed - should be detected as ف + إن (two prefixes) per database-examples test
  // Note: "إنما" compound removed - should be detected as إن + ما (two prefixes) per database-examples test
  {
    arabic: 'أما',
    english: ['do you not', 'do not you', 'are you not', 'have you not', 'as for'],
    role: GrammaticalRole.INTERROGATIVE,
  }, // Interrogative + negation particle
  { arabic: 'ما', english: ['what', 'that which', 'only'], role: GrammaticalRole.INTERROGATIVE }, // Interrogative/relative - multi-word OK for standalone, 'only' in restrictive contexts (إنما)
  {
    arabic: 'من',
    english: ['who', 'whoever', 'whomever', 'he who', 'those who'],
    role: GrammaticalRole.INTERROGATIVE,
  }, // Relative pronoun - multi-word OK for standalone, removed from PARTICLES to prevent compounds
  { arabic: 'أن', english: ['that', 'to'], role: GrammaticalRole.PARTICLE },
  { arabic: 'إذا', english: ['if', 'when'], role: GrammaticalRole.PARTICLE },
  { arabic: 'كم', english: ['how much', 'how many', 'how'], role: GrammaticalRole.INTERROGATIVE },
  // Particles/prepositions ending in ى (alef maksura)
  { arabic: 'حتى', english: ['until', 'even', 'so that'], role: GrammaticalRole.PARTICLE },
  { arabic: 'حت', english: ['until', 'even'], role: GrammaticalRole.PARTICLE }, // Shortened form before possessive suffixes (حتى + ي → حتيّ → normalized: حت + ي)
  { arabic: 'متى', english: ['when', 'whenever'], role: GrammaticalRole.INTERROGATIVE },
  { arabic: 'مت', english: ['when'], role: GrammaticalRole.INTERROGATIVE }, // Shortened form before possessive suffixes (متى + ي → متيّ → normalized: مت + ي)
  { arabic: 'أنى', english: ['where', 'how', 'wherever'], role: GrammaticalRole.INTERROGATIVE },
  { arabic: 'أن', english: ['where', 'how'], role: GrammaticalRole.INTERROGATIVE }, // Shortened form before possessive suffixes (أنى + ي → أنيّ → normalized: أن + ي) - different from أن particle
];

/**
 * Create the final list of all prefixes for export.
 * Only base patterns - sequential detection handles multiple prefixes.
 * Note: No regex anchors needed - matching logic uses startsWith/endsWith
 */
function createFinalPrefixList(): WordComponent[] {
  const individualBasePrefixes = [
    ...BASE_CONJUNCTIONS,
    ...BASE_PREPOSITIONS,
    ...OTHER_PREFIXES,
  ].map(p => ({
    ...p,
    type: ComponentType.PREFIX,
  }));

  const flexibleDefiniteArticle: WordComponent = {
    ...DEFINITE_ARTICLE,
    type: ComponentType.PREFIX,
  };

  return [...individualBasePrefixes, flexibleDefiniteArticle].sort(
    (a, b) => b.arabic.length - a.arabic.length,
  );
}

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
    role: GrammaticalRole.VERB_CONJUGATION,
  },

  // Form VII passive/reflexive infix ن
  {
    arabic: 'ن',
    english: ['self', 'itself', 'automatically', 'spontaneously'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },

  // Form X seeking/requesting infix ست
  {
    arabic: 'ست',
    english: ['seek', 'sought', 'request', 'ask for', 'try to', 'attempt to'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },

  // Form IV causative infix أ (when internal)
  {
    arabic: 'أ',
    english: ['make', 'cause', 'let', 'allow', 'enable'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },

  // Intensive/repetitive infix patterns (Form II: doubled middle radical)
  {
    arabic: 'رر',
    english: ['repeatedly', 'again and again', 'continuously'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },
  {
    arabic: 'لل',
    english: ['repeatedly', 'continuously', 'persistently'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },
  {
    arabic: 'مم',
    english: ['make', 'cause to', 'intensify', 'thoroughly'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },
  {
    arabic: 'كك',
    english: ['intensely', 'repeatedly', 'thoroughly'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },
  {
    arabic: 'دد',
    english: ['repeatedly', 'intensify', 'multiply'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },

  // Comparative/superlative infix أ (when internal, different from causative)
  // Note: Removed ا (alif) and ي (yaa') infix patterns due to root letter ambiguity
  // These single-letter patterns caused false positives when root letters coincided
  // with English translations containing trigger words ('with', 'little', etc.)
  {
    arabic: 'أع',
    english: ['more', 'most', 'greater', 'superior'],
    type: ComponentType.INFIX,
    role: GrammaticalRole.VERB_CONJUGATION,
  },
];

/**
 * Arabic suffixes with their English equivalents
 * Note: No regex anchors needed - matching logic uses startsWith/endsWith
 */
export const ARABIC_SUFFIXES: WordComponent[] = [
  // Pronouns - possessive (normalized, no diacritics)
  {
    arabic: 'ي',
    role: GrammaticalRole.POSSESSIVE,
    english: ['my', 'mine', 'me', 'of me'], // Added standalone "me" for patterns like "on me"
    type: ComponentType.SUFFIX,
  },
  // Shadda-aware possessive suffixes (when attached to prepositions ending in ى)
  // e.g., على + ي → علىّ or عليّ (upon me), لدى + ي → لديّ (with me)
  {
    arabic: 'ىّ',
    english: ['my', 'me', 'of me'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'يّ',
    english: ['my', 'me', 'of me'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ك',
    english: ['your', 'yours', 'of you', 'of your', 'you'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ه',
    english: ['his', 'its', 'it', 'of him', 'of his', 'of it', 'of its', 'him', 'himself', 'he', 'their', 'whose'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  // Object pronoun - me
  {
    arabic: 'ني',
    english: ['me', 'my', 'of me'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ها',
    english: ['her', 'hers', 'its', 'it', 'of her', 'of it', 'of its', 'of their', 'their', 'them'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  // Common transliteration-equivalent: final "هِ" often maps to "it/its"; we already catch via 'ה' suffix
  // Keep 'it/its' present for 'ה' to handle cases like "...هِ"
  // Subjunctive suffix (ya + verb + tu = "to verb")
  {
    arabic: 'تُ',
    role: GrammaticalRole.PARTICLE,
    english: ['to'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'نا',
    english: ['our', 'ours', 'of us', 'us', 'we'], // 'we' for first-person plural subject in verb conjugations
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'كم',
    english: ['your', 'yours', 'of your', 'you all', 'you'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هم',
    english: ['their', 'theirs', 'of their', 'them'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  // Dual possessive/object pronouns
  {
    arabic: 'كما',
    english: ['you two', 'both of you', 'your (dual)'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هما',
    english: ['both of them', 'their (dual)', 'them two', 'them', 'which', 'those', 'these'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هن',
    english: ['their', 'theirs', 'them'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },

  // Standalone subject pronouns (when appearing after prefixes like و، ف)
  // These are treated as suffixes to enable coloring in combinations like وهو "and he"
  //
  // NOTE: These intentionally duplicate POSSESSIVE suffixes (هم, هن, هما) with different
  // English trigger words. The analysis engine matches based on which English words appear
  // in the translation, enabling context-dependent role assignment:
  //   - English has "they/he/she" (subject) → GENERIC wins → verbConjugation color
  //   - English has "their/his/her" (possessor) → POSSESSIVE wins → possessive color
  // Example: وهم "and they" → generic | كتابهم "their book" → possessive
  {
    arabic: 'هو',
    english: ['he', 'it', 'him'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هي',
    english: ['she', 'it', 'her'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هم',
    english: ['they', 'them'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هن',
    english: ['they', 'them'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هما',
    english: ['they two', 'both of them', 'them'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'انت',
    english: ['you'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'انتم',
    english: ['you all', 'you'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'انتن',
    english: ['you all', 'you'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'انتما',
    english: ['you two', 'you both'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'نحن',
    english: ['we', 'us'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'انا',
    english: ['I', 'me'],
    role: GrammaticalRole.GENERIC,
    type: ComponentType.SUFFIX,
  },

  // Perfect tense subject endings
  {
    arabic: 'ت',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['I', 'you'],
    type: ComponentType.SUFFIX,
  },

  // Common plural verbal/pronoun endings
  {
    arabic: 'وا',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['they', 'them', 'they did'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تم',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['you', 'you all', 'you did'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'كن',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['you', 'you all', 'you were'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تن',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['you', 'you all'],
    type: ComponentType.SUFFIX,
  },
  // Conditional particle as suffix for compound words like فإن
  {
    arabic: 'إن',
    role: GrammaticalRole.PARTICLE,
    english: ['if'],
    type: ComponentType.SUFFIX,
  },

  // Dual & plural markers - only include plausible word equivalents
  {
    arabic: 'ان',
    role: GrammaticalRole.PLURAL,
    english: ['two', 'both'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ين',
    role: GrammaticalRole.PLURAL,
    english: ['two', 'both'],
    type: ComponentType.SUFFIX,
  },

  // Compound dual + possessive suffixes (dual marker ين + possessive pronoun)
  // These appear in words like يَدَيْهِ (his hands = يد + ين + ه)
  {
    arabic: 'يه',
    role: GrammaticalRole.POSSESSIVE,
    english: ['his', 'its', 'their', 'hands', 'two'], // Dual possessive
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'يها',
    role: GrammaticalRole.POSSESSIVE,
    english: ['its', 'their', 'her', 'hands', 'two'], // Dual possessive feminine
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'يك',
    role: GrammaticalRole.POSSESSIVE,
    english: ['your', 'yours', 'hands', 'two'], // Dual possessive second person
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'يكم',
    role: GrammaticalRole.POSSESSIVE,
    english: ['your', 'yours', 'hands', 'two'], // Dual possessive plural
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'يهم',
    role: GrammaticalRole.POSSESSIVE,
    english: ['their', 'theirs', 'hands', 'two'], // Dual possessive plural masculine
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ون',
    role: GrammaticalRole.PLURAL,
    english: ['they', 'those who'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ات',
    role: GrammaticalRole.PLURAL,
    english: ['times', 'instances'],
    type: ComponentType.SUFFIX,
  },

  // Demonstrative pronouns - singular words only
  {
    arabic: 'هذا',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['this'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هذه',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['this'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ذلك',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['that'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تلك',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['that'],
    type: ComponentType.SUFFIX,
  },
].sort((a, b) => b.arabic.length - a.arabic.length); // Sort by length (longest first) for efficient matching

/**
 * Arabic diacritics with their English equivalents
 * These are vowel markings and grammatical indicators
 */
export const ARABIC_DIACRITICS: WordComponent[] = [
  // Fatha (ــَ) - short "a" vowel, often indicates accusative case or adverbial usage
  {
    arabic: 'َ', // Fatha at end of word
    english: ['he', 'a', 'an', 'as'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Kasra (ــِ) - short "i" vowel, often indicates genitive case
  {
    arabic: 'ِ', // Kasra at end of word
    english: ['in', 'of', 'with'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Damma (ــُ) - short "u" vowel, often indicates nominative case
  {
    arabic: 'ُ', // Damma at end of word
    english: ['he', 'it', 'they', 'of'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Tanween Fath (ــًا) - nunation with fatha, indicates indefinite accusative
  {
    arabic: 'ًا',
    english: ['an', 'as', 'a', 'one'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Standalone Tanween Fath (ــً) - without alif, common on taa marboota
  {
    arabic: 'ً',
    english: ['a', 'an', 'one'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Tanween Kasr (ــٍ) - nunation with kasra, indicates indefinite genitive
  {
    arabic: 'ٍ',
    english: ['of', 'in', 'at', 'a', 'something'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Tanween Damm (ــٌ) - nunation with damma, indicates indefinite nominative
  {
    arabic: 'ٌ',
    english: ['a', 'an', 'is', 'one'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Dual Nominative (ــانِ) - dual form in nominative case
  {
    arabic: 'انِ',
    english: ['two', 'both', 'dual'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Dual Accusative/Genitive (ــينِ) - dual form in accusative or genitive case
  {
    arabic: 'ينِ',
    english: ['two', 'both', 'dual'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Taa Marboota (ــتْ) - feminine past tense / passive marker
  {
    arabic: 'تْ',
    english: ['was', 'did', 'has', 'have been', 'take', 'takes', 'becomes', 'is', 'it'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // First person plural past tense (ــنَا) - "we did"
  {
    arabic: 'نَا',
    english: ['we', 'we were', 'we did'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // Dual subject marker (ــَا) - "they two" / dual
  {
    arabic: 'َا',
    english: ['they', 'both', 'they said', 'they two'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.CASE_ENDING,
  },

  // 3rd person masculine singular past tense (ــَ) - final fatha
  // The fatha on the last radical marks the default past tense form ("he did")
  // Safe from false positives: English word-boundary matching ensures "he" only matches
  // as a standalone token (e.g., "he said"), not as a substring (e.g., "the book")
  {
    arabic: 'َ',
    english: ['he'],
    type: ComponentType.DIACRITIC,
    role: GrammaticalRole.VERB_CONJUGATION,
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
    colorName: 'violet' as const, // Purple for transformation (verb forms VII, VIII, X)
    icon: '↔',
  },
  [ComponentType.SUFFIX]: {
    label: 'Suffix',
    colorName: 'warning' as const, // Warning color for better contrast in both light and dark modes
    icon: '←',
  },
  [ComponentType.DIACRITIC]: {
    label: 'Diacritic',
    colorName: 'accent' as const, // Azure blue for visibility
    icon: '◌',
  },
} as const;

/**
 * Grammatical role color mapping for educational differentiation
 * Uses dedicated grammar.* color palette (65-188° hue range) for sage-centric harmony
 */
export const GRAMMATICAL_ROLE_COLORS = {
  [GrammaticalRole.PREPOSITION]: 'grammar.preposition' as const, // amber (90°)
  [GrammaticalRole.POSSESSIVE]: 'grammar.possessive' as const, // sage (155°)
  [GrammaticalRole.PARTICLE]: 'grammar.particle' as const, // lime (110°)
  [GrammaticalRole.INTERROGATIVE]: 'grammar.interrogative' as const, // seafoam (185°)
  [GrammaticalRole.VERB_CONJUGATION]: 'grammar.verbConjugation' as const, // mintGreen (170°)
  [GrammaticalRole.NEGATION]: 'grammar.negation' as const, // olive (125°)
  [GrammaticalRole.SUBJECT_PREFIX]: 'grammar.subjectPrefix' as const, // skyBlue (225°)
  [GrammaticalRole.PLURAL]: 'grammar.plural' as const, // yellowGreen (140°)
  [GrammaticalRole.DEMONSTRATIVE]: 'grammar.demonstrative' as const, // teal (200°)
  [GrammaticalRole.CONJUNCTION]: 'grammar.conjunction' as const, // periwinkle (250°)
  [GrammaticalRole.FUTURE_TENSE]: 'grammar.futureTense' as const, // violet (270°)
  [GrammaticalRole.DEFINITE_ARTICLE]: 'grammar.definiteArticle' as const, // golden (50°)
  [GrammaticalRole.CASE_ENDING]: 'grammar.particle' as const, // Aliases to particle — diacritics typically use inheritColorFrom instead
  [GrammaticalRole.GENERIC]: 'grammar.verbConjugation' as const, // Aliases to verbConjugation — standalone pronouns (هو, هي, etc.)
} as const;

/**
 * Derived mapping from icon to component type
 * Used by colorCodedTextUtils.ts for positional scoring
 * Single source of truth: icons come from COMPONENT_TYPE_CONFIG
 */
export const ICON_TO_COMPONENT_TYPE = Object.fromEntries(
  Object.entries(COMPONENT_TYPE_CONFIG).map(([type, config]) => [config.icon, type]),
) as Record<string, ComponentType>;
