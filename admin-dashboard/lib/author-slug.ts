import { slugifyText } from '@/lib/slugify';
import type { Author } from '@/lib/types';

/**
 * Pure slug/path builders for author hub pages — no server-only imports, so
 * they're safe to use from client components (e.g. the article byline).
 * Format: "yunus-andreasson-3"; the trailing id is the source of truth.
 */
export function authorSlug(author: Pick<Author, 'id' | 'name'>): string {
  return `${slugifyText(author.name) || 'author'}-${author.id}`;
}

export function authorPath(author: Pick<Author, 'id' | 'name'>): string {
  return `/author/${authorSlug(author)}`;
}
