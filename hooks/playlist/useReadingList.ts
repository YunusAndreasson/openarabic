import { useQuery } from '@tanstack/react-query';

import { gated, readingProgressQueries } from '@/constants/queries';
import { useAppSelectorShallow } from '@/store/hooks';
import { pendingGuestBookmarks } from '@/utils/guestLibrary';

export function useReadingList(userId?: string) {
  const query = useQuery(gated(readingProgressQueries.readingList, userId));
  const guest = useAppSelectorShallow(state => ({
    bookmarks: state.guestLibrary.bookmarks,
    order: state.guestLibrary.order,
    receipt: userId ? state.guestLibrary.imported[userId] : undefined,
  }));
  const pending = pendingGuestBookmarks(guest.bookmarks, guest.receipt);
  const data = query.data ?? [];
  if (!pending.length) return { query, data, pending, guestOrder: guest.order };

  const knownIds = new Set(data.map(item => item.article_id));
  return {
    query,
    data: [...data, ...pending.filter(item => !knownIds.has(item.article_id))],
    pending,
    guestOrder: guest.order,
  };
}
