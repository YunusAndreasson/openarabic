/**
 * Lowercase a string into an ASCII, hyphen-separated slug fragment.
 * Non-alphanumerics collapse to a single hyphen; leading/trailing hyphens are
 * trimmed. Returns '' when the input has no ASCII alphanumerics (e.g. an
 * Arabic-only string) — callers should provide a fallback in that case.
 */
export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a URL-friendly slug from article title and ID
 * Format: "article-title-slug-123"
 *
 * @param title - Article title
 * @param id - Article ID
 * @returns URL-friendly slug
 */
export function generateSlug(title: string, id: number): string {
  return `${slugifyText(title)}-${id}`;
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

/**
 * Parse the trailing numeric ID from a slug without throwing.
 * Format: "anything-123" → 123. Returns null for malformed slugs so callers
 * can respond with notFound() instead of a 500.
 */
export function parseTrailingId(slug: string): number | null {
  const id = parseInt(slug.split('-').pop() ?? '', 10);
  return Number.isNaN(id) ? null : id;
}
