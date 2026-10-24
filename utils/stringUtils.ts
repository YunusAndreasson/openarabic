/**
 * String utility functions for text formatting and manipulation
 */

import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { fillTemplate } from '@/utils/fillTemplate';

/**
 * Validates if a value is a non-empty string.
 * Handles null, undefined, and empty strings consistently.
 *
 * @param value - Value to check
 * @returns True if value is a non-empty string
 *
 * @example
 * ```ts
 * isNonEmptyString('hello') // true
 * isNonEmptyString('  ') // false (whitespace only)
 * isNonEmptyString(null) // false
 * isNonEmptyString(undefined) // false
 * isNonEmptyString('') // false
 * ```
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Average sentences per minute for interactive bilingual Arabic learning
 * Very conservative estimate accounting for:
 * - Arabic script reading speed (significantly slower for learners)
 * - English translation reading (shown side-by-side for EVERY sentence)
 * - Interactive word tooltips (clicking words, reading definitions)
 * - Grammar analysis (color-coded components, grammar notes)
 * - Word details exploration (root meanings, word types)
 * - Mental processing to connect Arabic and English
 * - Diacritics and morphological analysis
 * - Re-reading sentences for comprehension
 * - Bilingual cognitive load (processing two languages simultaneously)
 */
const SENTENCES_PER_MINUTE = 4;

/**
 * Calculates estimated reading time based on sentence count
 * Optimized for interactive bilingual Arabic-English learning
 *
 * @param sentenceCount - Number of sentences in the article
 * @returns Formatted reading time string (e.g., "1 min", "3 min", "15 min")
 *
 * @example
 * calculateReadingTime(6) // "1 min"
 * calculateReadingTime(12) // "3 min"
 * calculateReadingTime(60) // "15 min"
 */
export function calculateReadingTime(sentenceCount: number): string {
  // Rounded up (better to overestimate than underestimate), and at least one
  // minute for readability on small cards — any positive count already is.
  const minutes = sentenceCount <= 0 ? 1 : Math.ceil(sentenceCount / SENTENCES_PER_MINUTE);
  return fillTemplate(STRINGS.READING_TIME_MINUTES, { minutes });
}

/**
 * Text separator used for displaying metadata (author, category, etc.)
 * Options: • (bullet), · (middle dot), / (slash), | (pipe)
 */
const METADATA_SEPARATOR = '·'; // Middle dot - clean and modern

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * A count as a learner reads it: "7,519", not "7519".
 *
 * Every dashboard number goes through this. Practice totals pass a thousand
 * within weeks, and a bare four-digit run has to be counted digit by digit to
 * tell 1967 from 19670. Grouping is done by hand rather than through
 * `toLocaleString` so the output is identical on Hermes, in jest and on every
 * device locale — the copy around it is English, and so is the separator.
 */
export function formatCount(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * A study word's root, read as the lemma line every word screen, rail card and
 * dictionary row shows: the Arabic letters and a capitalized English gloss.
 * `word` is optional so a caller mid-resolution (a sheet whose word hasn't
 * loaded yet) can pass it straight through instead of guarding first.
 */
export function getRootLemma(word?: Pick<StudyWord, 'root'>): {
  arabicText: string;
  englishText: string;
} {
  return {
    arabicText: word?.root?.letters ?? '',
    englishText: capitalizeFirstLetter(word?.root?.meaning ?? ''),
  };
}

/**
 * Returns the display name for a category with proper transliteration.
 * Falls back to capitalizing the raw name for unknown categories.
 */
export function getCategoryDisplayName(rawName: string): string {
  const entry = STRINGS.CATEGORIES[rawName.toLowerCase()];
  return entry?.display ?? capitalizeFirstLetter(rawName);
}

/**
 * Returns the English subtitle for a category, or undefined if unknown.
 */
export function getCategorySubtitle(rawName: string): string | undefined {
  return STRINGS.CATEGORIES[rawName.toLowerCase()]?.subtitle;
}

/**
 * Returns the display name for an author with proper transliteration.
 * Falls back to the raw name for unknown authors.
 */
export function getAuthorDisplayName(rawName: string): string {
  return STRINGS.AUTHORS[rawName] ?? rawName;
}

/** Metadata parts joined with the separator: "Author · Category · 3 min". */
function joinMetadata(...parts: string[]): string {
  return parts.join(` ${METADATA_SEPARATOR} `);
}

/** An article's reading time, from its sentence count. */
function articleReadingTime(article: { article_sentences?: unknown[] }): string {
  return calculateReadingTime(article.article_sentences?.length ?? 0);
}

/**
 * Formats article metadata (author, category, and optionally reading time) for display
 * @param author - Author name
 * @param category - Category name (will be capitalized)
 * @param readingTime - Optional reading time (e.g., "3m", "< 1m")
 * @returns Formatted string like "Author Name · Category Name · 3m"
 * @example
 * formatArticleMetadata('Ibn Kathir', 'tafsir', '4m')
 * // Returns: 'Ibn Kathir · Tafsir · 4m'
 * @example
 * formatArticleMetadata('Ibn Kathir', 'tafsir')
 * // Returns: 'Ibn Kathir · Tafsir'
 */
export function formatArticleMetadata(
  author: string,
  category: string,
  readingTime?: string,
): string {
  if (!author || !category) return author || category || '';

  const base = joinMetadata(getAuthorDisplayName(author), getCategoryDisplayName(category));
  return readingTime ? joinMetadata(base, readingTime) : base;
}

/**
 * Formats article metadata with author, category, and reading time
 * Convenience function that calculates reading time from article sentence count
 * @param article - Article object with author, category, and article_sentences
 * @returns Formatted string like "Author Name · Category Name · 3 min"
 * @example
 * getArticleMetadata(article)
 * // Returns: 'Ibn Kathir · Tafsir · 4 min'
 */
export function getArticleMetadata(article: {
  author: { name: string };
  category: { name: string };
  article_sentences?: unknown[];
}): string {
  return formatArticleMetadata(
    article.author.name,
    article.category.name,
    articleReadingTime(article),
  );
}

/**
 * Formats article metadata with category and reading time only (no author)
 * Use when the author is shown elsewhere in the UI, e.g. under "More from {author}"
 * @param article - Article object with category and article_sentences
 * @returns Formatted string like "Category Name · 3 min"
 */
export function getArticleMetadataWithoutAuthor(article: {
  category: { name: string };
  article_sentences?: unknown[];
}): string {
  return joinMetadata(getCategoryDisplayName(article.category.name), articleReadingTime(article));
}

/**
 * Formats article metadata with author and reading time only (no category)
 * Use when category is shown elsewhere in the UI
 * @param article - Article object with author and article_sentences
 * @returns Formatted string like "Author Name · 3 min"
 * @example
 * getArticleMetadataWithoutCategory(article)
 * // Returns: 'Ibn Kathir · 4 min'
 */
export function getArticleMetadataWithoutCategory(article: {
  author: { name: string };
  article_sentences?: unknown[];
}): string {
  return joinMetadata(getAuthorDisplayName(article.author.name), articleReadingTime(article));
}

/**
 * Removes punctuation characters from word text for clean display
 * Strips: , . : ; ! ? ( ) [ ] { } " ' ` - — – / \ and Arabic punctuation
 * @param text - The word text to clean
 * @returns Clean text without punctuation
 * @example
 * cleanWordText('hello,') // 'hello'
 * cleanWordText('(world)') // 'world'
 * cleanWordText('مَرْحَبًا،') // 'مَرْحَبًا'
 */
export function cleanWordText(text: string): string {
  if (!text) return '';
  // Remove common punctuation (ASCII and Arabic)
  // Preserves Arabic diacritics (tashkeel) which are in Unicode range 0x064B-0x0652
  return text.replace(/[,.:;!?()[\]{}"'`\-—–/\\،؛؟«»]/g, '').trim();
}
