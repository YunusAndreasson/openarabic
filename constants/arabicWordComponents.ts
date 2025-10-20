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

/**
 * Grammatical roles for components - used for color differentiation and educational value
 */
export enum GrammaticalRole {
  CONJUNCTION = 'conjunction',        // و, ف - connecting words/clauses
  DEFINITE_ARTICLE = 'article',       // ال - the
  PREPOSITION = 'preposition',        // ب, ل, ك, في, من, على, عن, إلى - with, to, like, in, from, on, about, to
  SUBJECT_PREFIX = 'subject',         // ت, ي, ن, أ - verb conjugation markers (you, he, we, I)
  FUTURE_TENSE = 'future',            // س, سوف - will/shall
  NEGATION = 'negation',              // لا, لم, لن, لئلا, إلا, بل - not, no, except
  PARTICLE = 'particle',              // قد, إن, فإن, إنما, أما, أن, إذا, ثم - various grammatical particles
  INTERROGATIVE = 'interrogative',    // ما, من, كم - what, who, how (question words)
  POSSESSIVE = 'possessive',          // ي, ك, ه, ها, نا, كم, هم, هن - my, your, his, her, our, their
  PLURAL = 'plural',                  // ون, ين, ات - plural markers
  VERB_CONJUGATION = 'verb',          // ت, وا, تم, تن, كن - perfect tense verb endings (I, you, they)
  DEMONSTRATIVE = 'demonstrative',    // هذا, هذه, ذلك, تلك - this, that (pointing words)
  CASE_ENDING = 'case',               // ُ, َ, ِ - nominative, accusative, genitive diacritics
  GENERIC = 'generic',                // Fallback for unclassified components
}

export interface WordComponent {
  /** Arabic text pattern (regex) */
  arabic: string;
  /** English translation patterns that should contain this component */
  english: string[];
  /** Type of component */
  type: ComponentType;
  /** Grammatical role for color assignment and educational clarity (optional for backward compatibility during transition) */
  role?: GrammaticalRole;
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
  { arabic: 'و', english: ['and', 'also', 'plus', 'along with', 'while', 'by'], role: GrammaticalRole.CONJUNCTION }, // 'by' for oaths (e.g., "by Allah")
  { arabic: 'ف', english: ['so', 'then', 'thus', 'therefore', 'consequently', 'and', 'for', 'about', 'but'], role: GrammaticalRole.CONJUNCTION }, // 'about' for interrogatives like "what about", 'but' for adversative uses
];

const BASE_PREPOSITIONS = [
  {
    arabic: 'ب',
    english: ['with', 'by', 'in', 'via', 'through', 'using', 'according to', 'of', 'for', 'at', 'concerning', 'based'],
    role: GrammaticalRole.PREPOSITION,
  },
  { arabic: 'ل', english: ['to', 'for', 'toward', 'because of', 'in order to', 'of'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'ك', english: ['like', 'as', 'such as', 'similar to'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'في', english: ['in', 'at', 'inside', 'within', 'upon'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'من', english: ['from', 'of', 'than', 'out of'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'م', english: ['from', 'of'], role: GrammaticalRole.PREPOSITION }, // Shortened form in contractions (من + من → مِمَّن → normalized: م + من)
  { arabic: 'على', english: ['on', 'upon', 'over', 'above', 'against', 'to'], role: GrammaticalRole.PREPOSITION }, // 'to' for obligation/direction
  { arabic: 'عل', english: ['on', 'upon', 'to'], role: GrammaticalRole.PREPOSITION }, // Shortened form before possessive suffixes (على + ي → عليّ → normalized: عل + ي)
  { arabic: 'عن', english: ['about', 'from', 'concerning', 'regarding'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'إلى', english: ['to', 'towards', 'into', 'until'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'إل', english: ['to', 'towards'], role: GrammaticalRole.PREPOSITION }, // Shortened form before possessive suffixes (إلى + ي → إليّ → normalized: إل + ي)
  { arabic: 'لدى', english: ['with', 'at', 'by', 'near'], role: GrammaticalRole.PREPOSITION },
  { arabic: 'لد', english: ['with', 'at'], role: GrammaticalRole.PREPOSITION }, // Shortened form before possessive suffixes (لدى + ي → لديّ → normalized: لد + ي)
  // Note: ما moved to OTHER_PREFIXES to avoid compound generation (وما, فما)
];

const DEFINITE_ARTICLE = { arabic: 'ال', english: ['the'], role: GrammaticalRole.DEFINITE_ARTICLE };

//  2. Other standalone prefixes
const OTHER_PREFIXES = [
  // Future tense markers
  { arabic: 'س', english: ['will', 'shall'], role: GrammaticalRole.FUTURE_TENSE },
  { arabic: 'سوف', english: ['will', 'shall'], role: GrammaticalRole.FUTURE_TENSE },
  // Negation particles
  { arabic: 'لا', english: ['not', 'no', "don't", "doesn't", "didn't", 'do not'], role: GrammaticalRole.NEGATION },
  { arabic: 'لم', english: ['did not', "didn't", 'does not', "doesn't"], role: GrammaticalRole.NEGATION },
  { arabic: 'لن', english: ['will not', 'shall not', 'never', "won't"], role: GrammaticalRole.NEGATION },
  { arabic: 'لئلا', english: ['to not', 'lest', 'so that not', 'in order not to'], role: GrammaticalRole.NEGATION }, // Compound negation particle
  { arabic: 'إلا', english: ['except', 'but', 'only', 'none', 'nothing but'], role: GrammaticalRole.NEGATION },
  { arabic: 'بل', english: ['but', 'rather', 'instead'], role: GrammaticalRole.CONJUNCTION },
  { arabic: 'ثم', english: ['then', 'and then', 'afterwards', 'moreover'], role: GrammaticalRole.CONJUNCTION }, // Actually a conjunction
  // Verbal subject markers (present tense)
  { arabic: 'ي', english: ['he', 'it', 'was', 'is', 'does', 'to'], role: GrammaticalRole.SUBJECT_PREFIX }, // broader auxiliaries for gating, includes subjunctive 'to'
  { arabic: 'ت', english: ['you', 'she', 'it', 'does', 'is'], role: GrammaticalRole.SUBJECT_PREFIX }, // 'it' for 3rd person feminine singular (inanimate objects)
  { arabic: 'أ', english: ['I', 'do', 'am'], role: GrammaticalRole.SUBJECT_PREFIX },
  { arabic: 'ن', english: ['we', 'are', 'do'], role: GrammaticalRole.SUBJECT_PREFIX },
  // Aspect particles & common compounds
  { arabic: 'قد', english: ['already', 'indeed', 'used to', 'sometimes'], role: GrammaticalRole.PARTICLE },
  { arabic: 'إن', english: ['indeed', 'verily', 'if'], role: GrammaticalRole.PARTICLE },
  { arabic: 'فإن', english: ['for', 'so', 'then', 'therefore', 'because'], role: GrammaticalRole.PARTICLE }, // Compound: fa (so/then) + inna (emphasis)
  { arabic: 'إنما', english: ['only', 'truly', 'verily', 'indeed'], role: GrammaticalRole.PARTICLE }, // Restrictive particle
  { arabic: 'أما', english: ['do you not', 'do not you', 'are you not', 'have you not', 'as for'], role: GrammaticalRole.INTERROGATIVE }, // Interrogative + negation particle
  { arabic: 'ما', english: ['what', 'that which'], role: GrammaticalRole.INTERROGATIVE }, // Interrogative/relative - multi-word OK for standalone, removed from PARTICLES to prevent compounds
  { arabic: 'من', english: ['who', 'whoever', 'whomever', 'he who', 'those who'], role: GrammaticalRole.INTERROGATIVE }, // Relative pronoun - multi-word OK for standalone, removed from PARTICLES to prevent compounds
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
 */
function createFinalPrefixList(): WordComponent[] {
  const individualBasePrefixes = [
    ...BASE_CONJUNCTIONS,
    ...BASE_PREPOSITIONS,
    ...OTHER_PREFIXES,
  ].map(p => ({
    ...p,
    arabic: `^${p.arabic}`,
    type: ComponentType.PREFIX,
  }));

  const flexibleDefiniteArticle: WordComponent = {
    ...DEFINITE_ARTICLE,
    type: ComponentType.PREFIX,
  };

  return [
    ...individualBasePrefixes,
    flexibleDefiniteArticle,
  ].sort((a, b) => b.arabic.length - a.arabic.length);
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

  // Intensive/repetitive infix patterns (Form II: doubled middle radical)
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
  {
    arabic: 'مم',
    english: ['make', 'cause to', 'intensify', 'thoroughly'],
    type: ComponentType.INFIX,
  },
  {
    arabic: 'كك',
    english: ['intensely', 'repeatedly', 'thoroughly'],
    type: ComponentType.INFIX,
  },
  {
    arabic: 'دد',
    english: ['repeatedly', 'intensify', 'multiply'],
    type: ComponentType.INFIX,
  },

  // Reciprocal/associative infix (Forms III & VI: long alif between radicals)
  {
    arabic: 'ا',
    english: ['with', 'mutually', 'reciprocally', 'together with'],
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
    role: GrammaticalRole.POSSESSIVE,
    english: ['my', 'mine', 'of me'],
    type: ComponentType.SUFFIX,
  },
  // Shadda-aware possessive suffixes (when attached to prepositions ending in ى)
  // e.g., على + ي → علىّ or عليّ (upon me), لدى + ي → لديّ (with me)
  {
    arabic: 'ىّ$',
    english: ['my', 'me', 'of me'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'يّ$',
    english: ['my', 'me', 'of me'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ك$',
    english: ['your', 'yours', 'of you', 'you'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ه$',
    english: ['his', 'its', 'it', 'of him', 'him', 'himself', 'he', 'their'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  // Object pronoun - me
  {
    arabic: 'ني$',
    english: ['me', 'my', 'of me'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ها$',
    english: ['her', 'hers', 'its', 'it', 'of her', 'their'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  // Common transliteration-equivalent: final "هِ" often maps to "it/its"; we already catch via 'ه$'
  // Keep 'it/its' present for 'ه$' to handle cases like "...هِ"
  // Subjunctive suffix (ya + verb + tu = "to verb")
  {
    arabic: 'تُ$',
    role: GrammaticalRole.PARTICLE,
    english: ['to'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'نا$',
    english: ['our', 'ours', 'of us', 'us', 'we'], // 'we' for first-person plural subject in verb conjugations
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'كم$',
    english: ['your', 'yours', 'you all', 'you'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هم$',
    english: ['their', 'theirs', 'them'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  // Dual possessive/object pronouns
  {
    arabic: 'كما$',
    english: ['you two', 'both of you', 'your (dual)'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هما$',
    english: ['both of them', 'their (dual)', 'them two', 'them', 'which', 'those', 'these'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هن$',
    english: ['their', 'theirs', 'them'],
    role: GrammaticalRole.POSSESSIVE,
    type: ComponentType.SUFFIX,
  },

  // Perfect tense subject endings
  {
    arabic: 'ت$',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['I', 'you'],
    type: ComponentType.SUFFIX,
  },

  // Common plural verbal/pronoun endings
  {
    arabic: 'وا$',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['they', 'them', 'they did'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تم$',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['you', 'you all', 'you did'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'كن$',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['you', 'you all', 'you were'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تن$',
    role: GrammaticalRole.VERB_CONJUGATION,
    english: ['you', 'you all'],
    type: ComponentType.SUFFIX,
  },
  // Conditional particle as suffix for compound words like فإن
  {
    arabic: 'إن$',
    role: GrammaticalRole.PARTICLE,
    english: ['if'],
    type: ComponentType.SUFFIX,
  },

  // Dual & plural markers - only include plausible word equivalents
  {
    arabic: 'ان$',
    role: GrammaticalRole.PLURAL,
    english: ['two', 'both'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ين$',
    role: GrammaticalRole.PLURAL,
    english: ['two', 'both'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ون$',
    role: GrammaticalRole.PLURAL,
    english: ['they', 'those who'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ات$',
    role: GrammaticalRole.PLURAL,
    english: ['times', 'instances'],
    type: ComponentType.SUFFIX,
  },

  // Demonstrative pronouns - singular words only
  {
    arabic: 'هذا$',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['this'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'هذه$',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['this'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'ذلك$',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['that'],
    type: ComponentType.SUFFIX,
  },
  {
    arabic: 'تلك$',
    role: GrammaticalRole.DEMONSTRATIVE,
    english: ['that'],
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
    arabic: 'َ', // Fatha at end of word
    english: ['he', 'a', 'an', 'as'],
    type: ComponentType.DIACRITIC,
  },

  // Kasra (ــِ) - short "i" vowel, often indicates genitive case
  {
    arabic: 'ِ', // Kasra at end of word
    english: ['in', 'of', 'with'],
    type: ComponentType.DIACRITIC,
  },

  // Damma (ــُ) - short "u" vowel, often indicates nominative case
  {
    arabic: 'ُ', // Damma at end of word
    english: ['he', 'it', 'they', 'of'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Fath (ــًا) - nunation with fatha, indicates indefinite accusative
  {
    arabic: 'ًا',
    english: ['an', 'as', 'a', 'one'],
    type: ComponentType.DIACRITIC,
  },

  // Standalone Tanween Fath (ــً) - without alif, common on taa marboota
  {
    arabic: 'ً',
    english: ['a', 'an', 'one'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Kasr (ــٍ) - nunation with kasra, indicates indefinite genitive
  {
    arabic: 'ٍ',
    english: ['of', 'in', 'at', 'a', 'something'],
    type: ComponentType.DIACRITIC,
  },

  // Tanween Damm (ــٌ) - nunation with damma, indicates indefinite nominative
  {
    arabic: 'ٌ',
    english: ['a', 'an', 'is', 'one'],
    type: ComponentType.DIACRITIC,
  },

  // Dual Nominative (ــانِ) - dual form in nominative case
  {
    arabic: 'انِ',
    english: ['two', 'both', 'dual'],
    type: ComponentType.DIACRITIC,
  },

  // Dual Accusative/Genitive (ــينِ) - dual form in accusative or genitive case
  {
    arabic: 'ينِ',
    english: ['two', 'both', 'dual'],
    type: ComponentType.DIACRITIC,
  },

  // Taa Marboota (ــتْ) - feminine past tense / passive marker
  {
    arabic: 'تْ',
    english: ['was', 'did', 'has', 'have been', 'take', 'takes', 'becomes', 'is', 'it'],
    type: ComponentType.DIACRITIC,
  },

  // First person plural past tense (ــنَا) - "we did"
  {
    arabic: 'نَا',
    english: ['we', 'we were', 'we did'],
    type: ComponentType.DIACRITIC,
  },

  // Dual subject marker (ــَا) - "they two" / dual
  {
    arabic: 'َا',
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
 * Used when components have a defined grammatical role for more precise coloring
 */
export const GRAMMATICAL_ROLE_COLORS = {
  [GrammaticalRole.CONJUNCTION]: 'secondary' as const,       // Forest green for conjunctions (و, ف)
  [GrammaticalRole.DEFINITE_ARTICLE]: 'tint' as const,     // SAGE GREEN for article (ال)
  [GrammaticalRole.PREPOSITION]: 'warning' as const,          // AMBER/ORANGE for prepositions (ب, ل, ك, في)
  [GrammaticalRole.SUBJECT_PREFIX]: 'secondary' as const,  // Forest green for verb conjugation (ت, ي, ن, أ)
  [GrammaticalRole.FUTURE_TENSE]: 'info' as const,         // Info color for future tense (س, سوف) - distinct from prepositions
  [GrammaticalRole.NEGATION]: 'error' as const,            // Red for negation (لا, لم, لن)
  [GrammaticalRole.PARTICLE]: 'accent' as const,           // Azure blue for particles (قد, إن)
  [GrammaticalRole.INTERROGATIVE]: 'accent' as const,      // Azure blue for questions (ما, من, كم) - distinct from possessives
  [GrammaticalRole.POSSESSIVE]: 'violet' as const,         // Violet for possessive suffixes (ي, ك, ه)
  [GrammaticalRole.PLURAL]: 'primary' as const,            // Primary (gray/sage) for plural markers (ون, ين, ات)
  [GrammaticalRole.VERB_CONJUGATION]: 'success' as const, // Success green for verb endings (ت, وا, تم, تن, كن)
  [GrammaticalRole.DEMONSTRATIVE]: 'primary' as const,     // Primary color for demonstratives (هذا, ذلك) - same as plural
  [GrammaticalRole.CASE_ENDING]: 'accent' as const,        // Azure blue for case diacritics (ُ, َ, ِ)
  [GrammaticalRole.GENERIC]: 'tint' as const,              // Sage green fallback
} as const;
