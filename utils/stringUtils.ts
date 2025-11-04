/**
 * String utility functions for text formatting and manipulation
 */

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
