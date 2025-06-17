import type { Article, Author } from './articles.types';
import type { Tables } from './database.types';

/**
 * Reading list item combining user/article relation with article details
 */
export interface ReadingListItem extends Tables<'reading_list'> {
  /** Full article details including author information */
  articles: Article & { author: Author };
}
