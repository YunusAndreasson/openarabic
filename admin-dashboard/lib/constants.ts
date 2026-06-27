/**
 * Shared constants for the application
 * Single source of truth for configuration values
 */

/**
 * Canonical production origin. Single source of truth for absolute URLs in
 * metadata, canonicals, JSON-LD, and the sitemap — never hardcode the literal.
 */
export const SITE_URL = 'https://openarabic.io';

/**
 * Number of articles to fetch per page
 * Used for pagination and infinite scroll
 */
export const ITEMS_PER_PAGE = 12;

/**
 * Number of skeleton cards to show while loading
 * Typically 3 to show above the fold on desktop
 */
export const SKELETON_CARD_COUNT = 3;
