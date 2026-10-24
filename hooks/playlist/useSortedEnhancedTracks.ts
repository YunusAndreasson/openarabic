import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { audioQueries, gated, readingProgressQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAppSelector } from '@/store/hooks';
import { selectAudioLanguage } from '@/store/settingsSlice';
import { sortByCustomOrder, sortByDateDesc } from '@/utils/sortingUtils';

/**
 * The reading list and its audio tracks, in the order the Playlist screen
 * shows them: the listener's drag order first, then newest first, one entry
 * per article.
 *
 * Shared by the screen and its header so that Play all plays what the list
 * shows. The header used to read the raw tracks query instead — newest-saved
 * order, ignoring any reordering — so the queue disagreed with the screen it
 * was started from.
 */
export function useSortedEnhancedTracks() {
  const { user } = useAuth();
  const customOrder = useAppSelector(state => state.playlist.customOrder);
  const audioPreference = useAppSelector(selectAudioLanguage);

  const readingListQuery = useQuery(gated(readingProgressQueries.readingList, user?.id));
  const { data: readingList = [] } = readingListQuery;

  const sortedReadingList = useMemo(() => {
    if (!readingList.length) return [];

    // Deduplicate while preserving order
    const seen = new Set<number>();
    const deduped = readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });

    // Sort by custom order with date fallback
    return sortByCustomOrder(
      deduped,
      customOrder,
      item => item.article_id,
      (a, b) => sortByDateDesc(a.added_at, b.added_at),
    );
  }, [readingList, customOrder]);

  const enhancedTracksQuery = useQuery(
    gated(userId => audioQueries.tracks(userId, audioPreference), user?.id),
  );
  const { data: enhancedTracks = [] } = enhancedTracksQuery;

  const sortedEnhancedTracks = useMemo(() => {
    if (!enhancedTracks.length || !sortedReadingList.length) return enhancedTracks;

    // Create position map from sorted reading list order
    const readingListOrder = sortedReadingList.map(item => item.article_id);

    // One track per article, like the list itself: the tracks are built from
    // the raw reading list, which can hold an article twice.
    const seen = new Set<number | string>();
    return sortByCustomOrder(
      enhancedTracks,
      readingListOrder,
      track => track.articleId || 0,
    ).filter(track => {
      const article = track.articleId ?? track.id;
      if (seen.has(article)) return false;
      seen.add(article);
      return true;
    });
  }, [enhancedTracks, sortedReadingList]);

  return { readingListQuery, sortedReadingList, enhancedTracksQuery, sortedEnhancedTracks };
}
