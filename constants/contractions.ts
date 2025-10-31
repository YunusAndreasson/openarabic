/**
 * English Contractions
 *
 * Comprehensive mapping of English contractions to their expanded forms.
 * Used for matching contracted text against expanded component patterns
 * in Arabic word analysis and color-coded text utilities.
 *
 * All contractions are lowercase for case-insensitive matching.
 */

/**
 * Maps contracted forms to their expanded equivalents
 * @example "don't" → "do not"
 * @example "it's" → "it is"
 */
export const CONTRACTION_MAP: Record<string, string> = {
  // Negation contractions
  "won't": 'will not',
  "can't": 'cannot',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "hadn't": 'had not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "couldn't": 'could not',
  "mustn't": 'must not',
  "mightn't": 'might not',
  "shan't": 'shall not',

  // "Will" contractions
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "we'll": 'we will',
  "they'll": 'they will',

  // "Be" verb contractions
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',

  // "Have" contractions
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',

  // "Would/Had" contractions
  "i'd": 'i would',
  "you'd": 'you would',
  "he'd": 'he would',
  "she'd": 'she would',
  "we'd": 'we would',
  "they'd": 'they would',

  // "Let" contractions
  "let's": 'let us',

  // "That/What/Where/etc" contractions
  "that's": 'that is',
  "there's": 'there is',
  "here's": 'here is',
  "what's": 'what is',
  "who's": 'who is',
  "where's": 'where is',
  "when's": 'when is',
  "why's": 'why is',
  "how's": 'how is',
};

/**
 * Pre-computed Set of all contraction expansions for O(1) lookup
 * Used to quickly check if a phrase is a contraction expansion (e.g., "do not")
 * @example CONTRACTION_EXPANSIONS.has("do not") → true
 */
export const CONTRACTION_EXPANSIONS = new Set(Object.values(CONTRACTION_MAP));

/**
 * Pre-computed reverse map from expansion to contraction for O(1) lookup
 * Used to quickly find the contracted form of an expansion
 * @example EXPANSION_TO_CONTRACTION.get("do not") → "don't"
 */
export const EXPANSION_TO_CONTRACTION = new Map(
  Object.entries(CONTRACTION_MAP).map(([contraction, expansion]) => [expansion, contraction]),
);
