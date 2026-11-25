import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { AppState } from 'react-native';

import { readingProgressQueries } from '@/constants/queries';
import { ReadingProgressService } from '@/services/readingProgress';
import { checkAuthentication } from '@/services/supabase';
import { guestImportRecorded } from '@/store/guestLibrarySlice';
import { useAppSelector } from '@/store/hooks';
import { setCustomOrder } from '@/store/playlistSlice';
import { store } from '@/store/store';
import type { ArticleId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { mergePlaylist, pendingGuestBookmarks, pendingGuestProgress } from '@/utils/guestLibrary';
import { guestPlaylistImportMutation } from '@/utils/mutationDefaults';
import { sortByCustomOrder, sortByDateDesc } from '@/utils/sortingUtils';
import { managedRequest } from '@/utils/supabaseHelpers';

export function GuestLibraryImport({ owner }: { owner?: string }) {
  const library = useAppSelector(state => state.guestLibrary);
  const client = useQueryClient();
  const bookmarkImport = useMutation(guestPlaylistImportMutation);

  const start = useEffectEvent((userId: string, signal: AbortSignal) => {
    if (!onlineManager.isOnline()) return;
    const cancelled = () => signal.aborted;
    const guest = store.getState().guestLibrary;
    const receipt = guest.imported[userId];
    const items = pendingGuestBookmarks(guest.bookmarks, receipt);
    const positions = pendingGuestProgress(guest.progress, receipt);
    if (!items.length && !positions.length) return;

    async function importPlaylist() {
      if (!items.length || cancelled()) return;
      const listQuery = readingProgressQueries.readingList(userId);
      const cached = client.getQueryData(listQuery.queryKey) ?? [];
      const order = store.getState().playlist.customOrder;
      // Take the existing order before insertion, since additions are returned newest first.
      const existing = sortByCustomOrder(
        cached,
        order,
        item => item.article_id,
        (a, b) => sortByDateDesc(a.added_at, b.added_at),
      );
      await bookmarkImport.mutateAsync({
        userId,
        articleIds: items.map(item => item.article_id as ArticleId),
      });
      if (cancelled()) return;
      const refreshed = await client.query({ ...listQuery, staleTime: 0 });
      if (cancelled()) return;
      const combined = mergePlaylist(items, guest.order, existing.length ? existing : refreshed);
      if (store.getState().playlist.customOrder === order) {
        store.dispatch(setCustomOrder(combined.map(item => item.article_id)));
      }
      store.dispatch(
        guestImportRecorded({
          owner: userId,
          receipt: {
            bookmarks: Object.fromEntries(items.map(item => [item.article_id, item.added_at])),
            progress: {},
          },
        }),
      );
      void readingProgressQueries.onListChanged(client, userId);
    }

    async function importProgress() {
      const query = readingProgressQueries.bulk(userId);
      for (const row of positions) {
        if (cancelled()) return;
        await checkAuthentication(userId);
        if (cancelled()) return;
        const articleId = row.article_id as ArticleId;
        await ReadingProgressService.updateProgress(
          {
            userId,
            articleId,
            lastSentenceRead: row.last_sentence_read,
            totalSentences: row.total_sentences,
          },
          managedRequest(signal),
        );
        if (cancelled()) return;
        client.setQueryData(query.queryKey, old => {
          const progress = new Map(old);
          if (row.last_sentence_read > (progress.get(articleId)?.last_sentence_read ?? -1)) {
            progress.set(articleId, { ...row, user_id: userId });
          }
          return progress;
        });
        store.dispatch(
          guestImportRecorded({
            owner: userId,
            receipt: { bookmarks: {}, progress: { [row.article_id]: row.last_sentence_read } },
          }),
        );
      }
      if (positions.length) void client.invalidateQueries({ queryKey: query.queryKey });
    }

    return Promise.allSettled([importPlaylist(), importProgress()]).then(results => {
      if (cancelled()) return;
      for (const result of results) {
        if (result.status === 'rejected')
          void handleError(result.reason, { showToast: false, trackAnalytics: false });
      }
    });
  });

  const { bookmarks, progress } = library;
  useEffect(() => {
    if (!owner) return;
    const lifetime = new AbortController();
    let running = false;
    let again = false;

    function run() {
      if (!owner || lifetime.signal.aborted) return;
      if (running) {
        again = true;
        return;
      }
      const work = start(owner, lifetime.signal);
      if (!work) return;
      running = true;
      void work.finally(() => {
        running = false;
        if (again) {
          again = false;
          run();
        }
      });
    }

    const detachOnline = onlineManager.subscribe(online => {
      if (online) run();
    });
    const detachApp = AppState.addEventListener('change', state => {
      if (state === 'active') run();
    });
    run();
    return () => {
      lifetime.abort();
      detachOnline();
      detachApp.remove();
    };
    // A guest write flushed as the auth screen closes belongs in the new import.
  }, [owner, bookmarks, progress]);
  return null;
}
