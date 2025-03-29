/**
 * Default images and placeholders used throughout the app
 */

export const DEFAULT_IMAGES = {
  /** Default article placeholder - using a remote URL for reliability */
  ARTICLE_PLACEHOLDER: 'https://placehold.co/800x400/F5F5F5/CCCCCC?text=No+Image',

  /** Default blurhash for article placeholder */
  ARTICLE_PLACEHOLDER_BLURHASH: 'L9R:+n%M-;-;~qxu-;M{-;IU%Mt7',

  /** Default thumbhash for article placeholder - more efficient than blurhash */
  ARTICLE_PLACEHOLDER_THUMBHASH: 'FQQODgAAGx8rAAAAAAAAAAAANwAAGgAGaAAA',
} as const;
