import type { ReadingProgress } from '@/services/readingProgress';
import type { GuestImportReceipt } from '@/store/guestLibrarySlice';
import type { Article } from '@/types/articles.types';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { sortByCustomOrder, sortByDateDesc } from '@/utils/sortingUtils';

export function guestBookmark(article: Article, addedAt: string): BookmarkItem {
  const { article_sentences, ...metadata } = article;
  return {
    user_id: '',
    article_id: article.id,
    added_at: addedAt,
    articles: {
      ...metadata,
      article_sentences: article_sentences.map(({ id }) => ({ id })),
    },
  };
}

export function guestProgressRow(
  articleId: ArticleId,
  sentence: number,
  total: number,
  updatedAt: string,
): ReadingProgress {
  return {
    created_at: updatedAt,
    user_id: '',
    article_id: articleId,
    last_sentence_read: sentence,
    total_sentences: total,
    updated_at: updatedAt,
  };
}

export function pendingGuestBookmarks(
  bookmarks: readonly BookmarkItem[],
  receipt?: GuestImportReceipt,
): BookmarkItem[] {
  return bookmarks.filter(item => receipt?.bookmarks[item.article_id] !== item.added_at);
}

export function pendingGuestProgress(
  progress: Readonly<Record<number, ReadingProgress>>,
  receipt?: GuestImportReceipt,
): ReadingProgress[] {
  return Object.values(progress).filter(
    row => row.last_sentence_read > (receipt?.progress[row.article_id] ?? -1),
  );
}

export function mergePlaylist(
  guest: readonly BookmarkItem[],
  order: readonly number[],
  account: readonly BookmarkItem[],
): BookmarkItem[] {
  const sorted = sortByCustomOrder(
    [...guest],
    [...order],
    item => item.article_id,
    (a, b) => sortByDateDesc(a.added_at, b.added_at),
  );
  const ids = new Set(sorted.map(item => item.article_id));
  return [...sorted, ...account.filter(item => !ids.has(item.article_id))];
}
