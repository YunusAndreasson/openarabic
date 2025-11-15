/**
 * Generate a URL-friendly slug from article title and ID
 * Format: "article-title-slug-123"
 *
 * @param title - Article title
 * @param id - Article ID
 * @returns URL-friendly slug
 */
export function generateSlug(title: string, id: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${id}`;
}

/**
 * Parse article ID from slug
 *
 * @param slug - URL slug (e.g., "article-title-123")
 * @returns Article ID
 */
export function parseIdFromSlug(slug: string): number {
  const parts = slug.split('-');
  const id = parseInt(parts[parts.length - 1]);

  if (isNaN(id)) {
    throw new Error(`Invalid slug format: ${slug}`);
  }

  return id;
}
