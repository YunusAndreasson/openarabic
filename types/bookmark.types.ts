import type { Article, Author } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';

/**
 * Bookmark item combining user/article relation with article details
 */
export interface BookmarkItem extends Tables<'reading_list'> {
  /** Full article details including author information */
  articles: Article & { author: Author };
}

/**
 * @deprecated Use BookmarkItem instead
 */
export type ReadingListItem = BookmarkItem;
