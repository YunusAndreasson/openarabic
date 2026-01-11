/**
 * String utility functions for text formatting and manipulation
 */

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
  if (sentenceCount <= 0) {
    return '1 min';
  }

  // Calculate minutes and round up (better to overestimate than underestimate)
  const minutes = Math.ceil(sentenceCount / SENTENCES_PER_MINUTE);

  // Minimum 1 minute for readability on small cards
  if (minutes < 1) {
    return '1 min';
  }

  return `${minutes} min`;
}

/**
 * Text separator used for displaying metadata (author, category, etc.)
 * Options: • (bullet), · (middle dot), / (slash), | (pipe)
 */
export const METADATA_SEPARATOR = '·'; // Middle dot - clean and modern

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats author and category for display with consistent separator
 * @param author - Author name
 * @param category - Category name (will be capitalized)
 * @returns Formatted string like "Author Name · Category Name"
 * @example
 * formatAuthorCategory('Ibn Kathir', 'tafsir')
 * // Returns: 'Ibn Kathir · Tafsir'
 */
export function formatAuthorCategory(author: string, category: string): string {
  if (!author || !category) return author || category || '';

  const capitalizedCategory = capitalizeFirstLetter(category);
  return `${author} ${METADATA_SEPARATOR} ${capitalizedCategory}`;
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

  const capitalizedCategory = capitalizeFirstLetter(category);
  const base = `${author} ${METADATA_SEPARATOR} ${capitalizedCategory}`;

  if (readingTime) {
    return `${base} ${METADATA_SEPARATOR} ${readingTime}`;
  }

  return base;
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
  const sentenceCount = article.article_sentences?.length || 0;
  const readingTime = calculateReadingTime(sentenceCount);

  return formatArticleMetadata(article.author.name, article.category.name, readingTime);
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
  const sentenceCount = article.article_sentences?.length || 0;
  const readingTime = calculateReadingTime(sentenceCount);

  return `${article.author.name} ${METADATA_SEPARATOR} ${readingTime}`;
}

/**
 * Generates a formatted metadata string for an article, excluding the author.
 * Used when the author is already shown (e.g., Author in Focus section).
 *
 * @example
 * getArticleMetadataWithoutAuthor(article)
 * // Returns: 'Tafsir · 4 min'
 */
export function getArticleMetadataWithoutAuthor(article: {
  category: { name: string };
  article_sentences?: unknown[];
}): string {
  const sentenceCount = article.article_sentences?.length || 0;
  const readingTime = calculateReadingTime(sentenceCount);

  return `${capitalizeFirstLetter(article.category.name)} ${METADATA_SEPARATOR} ${readingTime}`;
}

/**
 * Formats article metadata with author and category only (no reading time)
 * Use when reading time is implied by context (e.g., Quick Reads section)
 * @param article - Article object with author and category
 * @returns Formatted string like "Author Name · Category Name"
 * @example
 * getArticleMetadataWithoutTime(article)
 * // Returns: 'Ibn Kathir · Tafsir'
 */
export function getArticleMetadataWithoutTime(article: {
  author: { name: string };
  category: { name: string };
}): string {
  return `${article.author.name} ${METADATA_SEPARATOR} ${capitalizeFirstLetter(article.category.name)}`;
}

/**
 * Extracts and formats the first name from an email address
 * @param email - The email address to extract the name from
 * @returns The formatted first name or 'User' as fallback
 */
export const getFirstNameFromEmail = (email: string): string => {
  if (!email) return 'User';

  const localPart = email.split('@')[0];
  if (!localPart) return 'User';

  // Handle common separators and capitalize
  const cleanName = localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  return cleanName.split(' ')[0] || 'User';
};

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
