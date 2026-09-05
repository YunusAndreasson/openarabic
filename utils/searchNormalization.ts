/**
 * Text folding for the app's search boxes — one normalizer for both scripts.
 *
 * WHY THIS EXISTS: every searchable string in the corpus carries marks the
 * learner will not type. Bodies are vocalised (`التَّوْفِيق`), and titles, books
 * and author names are scholarly transliteration (`Ṣayd al-Khāṭir`). Matching
 * the raw text means "التوفيق" and "sayd al-khatir" — the two things anyone
 * actually types — both miss. Folding both the haystack and the needle through
 * this function is what makes them hit.
 *
 * The database cannot do this for us: it has no `tsvector` column, no trigram
 * index, and neither `pg_trgm` nor `unaccent` is installed, so a server-side
 * `ilike` would match the literal bytes or nothing. All folding is local.
 */

/**
 * Latin letters carrying transliteration marks, plus the punctuation the corpus
 * was typeset with. Written as an explicit map rather than the usual
 * `normalize('NFD')` + combining-mark strip: the complete set of non-ASCII
 * characters in the corpus was enumerated from the database and is exactly the
 * list below, nothing in this codebase calls `String.prototype.normalize`
 * today, and Hermes' support for it is unverified. A lookup table cannot fail
 * at runtime the way a missing Unicode implementation can.
 *
 * Keys are lowercase only — `toLowerCase()` runs first, and it already folds
 * `Ā`/`Ḥ`/`Ṣ`/`Ṭ` onto their lowercase forms.
 *
 * The three hamza/ayn marks (ʻ ʾ ʿ), `ﷺ`, and the punctuation all fold to
 * nothing rather than to a space, so `al-Kalim` becomes `alkalim`: a query
 * typed as `al kalim`, `al-kalim` or `alkalim` then matches it either way,
 * because every token is tested as a substring.
 */
const LATIN_FOLD_MAP: Record<string, string> = {
  ā: 'a',
  ḍ: 'd',
  ḥ: 'h',
  ī: 'i',
  ṣ: 's',
  ṭ: 't',
  ū: 'u',
  ẓ: 'z',
  ʻ: '',
  ʾ: '',
  ʿ: '',
  ﷺ: '', // ﷺ, the salutation ligature
};

const LATIN_FOLD_REGEX = new RegExp(`[${Object.keys(LATIN_FOLD_MAP).join('')}]`, 'g');

/**
 * Punctuation and symbols, in both scripts. Spelled out as an explicit class
 * rather than the shorter `/[^\p{L}\p{N}\s]/u`, for the same reason the Latin
 * fold above is a lookup table: Unicode property escapes are a runtime feature
 * of the regex engine, and this file deliberately assumes nothing about what
 * Hermes implements. `utils/stringUtils.ts`'s `cleanWordText` strips the same
 * way.
 *
 * ASCII `!`-`/`, `:`-`@`, `[`-`` ` ``, `{`-`~` (all ASCII punctuation), then
 * guillemets, the dash and quote blocks the corpus is typeset with, the
 * ellipsis, and Arabic comma / semicolon / question mark / full stop /
 * thousands separators.
 */
const PUNCTUATION_REGEX =
  /[!-\/:-@[-`{-~\u00AB\u00BB\u2010-\u2015\u2018-\u201F\u2026\u060C\u061B\u061F\u066A-\u066D\u06D4]/g;

/**
 * Arabic marks a learner never types: harakat and shadda (064B–065F), the
 * superscript alef (0670), the Quranic annotation signs (0610–061A and
 * 06D6–06ED), and tatweel (0640), which is decoration rather than a letter.
 *
 * Wider than `DIACRITIC_REGEX_GLOBAL` in `utils/arabicAnalysis/constants.ts` on
 * purpose — that one serves the grammar classifier, which must not lose
 * anything it reasons about.
 */
const ARABIC_MARKS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Letter folds, following the standard Arabic search normalization: every alef
 * variant to bare alef, alef maqsura to yeh, ta marbuta to heh.
 *
 * NOTE THE DIVERGENCE FROM `normalizeArabic`
 * (`utils/arabicAnalysis/normalization.ts`): that function deliberately
 * preserves `أ` so the classifier can tell the first-person prefix from the
 * prosthetic alef of Form VII–X verbs. That distinction is signal there and
 * noise here — someone searching for `أحمد` and someone searching for `احمد`
 * want the same texts. Do not "fix" either function into the other.
 */
const ARABIC_LETTER_FOLDS: [RegExp, string][] = [
  [/[\u0622\u0623\u0625\u0671]/g, '\u0627'], // alef madda / hamza above / hamza below / wasla → alef
  [/\u0649/g, '\u064A'], // alef maqsura → yeh
  [/\u0629/g, '\u0647'], // ta marbuta → heh
];

const WHITESPACE_REGEX = /\s+/g;

/**
 * A NOTE ON THE SLASH, which this file folds away rather than to a space.
 *
 * `normalizeEnglish` (`utils/arabicAnalysis/normalization.ts`) turns `/` into a
 * space on purpose: an alternative gloss like "he/it" welded into "heit" is
 * unmatchable for anything comparing whole tokens, and that welding was a real
 * bug in the voice matcher. Here it is harmless and slightly better — every
 * comparison in this feature is a substring test, so "heit" is still found by
 * "he", by "it", by "he it" and by "he/it", while spacing it would lose the
 * last of those. Do not align the two functions without checking which kind of
 * comparison the caller does.
 */

/**
 * Folds text into the form both sides of a search comparison are held in.
 *
 * Apply it to the query and to every field being searched — a match is only
 * meaningful when both went through the same folding.
 *
 * @example normalizeForSearch('Ṣayd al-Khāṭir') → 'sayd alkhatir'
 * @example normalizeForSearch('التَّوْفِيق') → 'التوفيق'
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';

  let normalized = text.toLowerCase().replace(LATIN_FOLD_REGEX, char => LATIN_FOLD_MAP[char] ?? '');

  normalized = normalized.replace(ARABIC_MARKS_REGEX, '');

  for (const [pattern, replacement] of ARABIC_LETTER_FOLDS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(PUNCTUATION_REGEX, '').replace(WHITESPACE_REGEX, ' ').trim();
}

/**
 * The folded, non-empty words of a query. Every token must be found for a row
 * to count as a match, so `sayd khatir` finds the book that `khatir sayd` also
 * finds — word order is not a filter.
 */
export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeForSearch(query);
  return normalized ? normalized.split(' ') : [];
}
