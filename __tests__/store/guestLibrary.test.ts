import { expect, test } from '@jest/globals';

import { articleId } from '@/__tests__/helpers/ids';
import { accountSwitched } from '@/store/accountActions';
import {
  guestArticlesAdded,
  guestArticleRemoved,
  guestImportRecorded,
  guestOrderChanged,
  guestProgressAdvanced,
} from '@/store/guestLibrarySlice';
import { rootReducer } from '@/store/rootReducer';
import { setArabicFontSize, setDailyWordLimit } from '@/store/settingsSlice';
import type { BookmarkItem } from '@/types/bookmark.types';
import {
  guestProgressRow,
  mergePlaylist,
  pendingGuestBookmarks,
  pendingGuestProgress,
} from '@/utils/guestLibrary';

const addedAt = '2026-11-24T12:00:00Z';
const item = (id: number, time = addedAt) => ({ article_id: id, added_at: time }) as BookmarkItem;

test('playlist handoff uses guest order, keeps existing account items, and ignores overlap', () => {
  const merged = mergePlaylist([item(1), item(2)], [2, 1], [item(1), item(3), item(4)]);
  expect(merged.map(row => row.article_id)).toEqual([2, 1, 3, 4]);
});

test('a receipt skips unchanged guest items, including after sign-out, and a deliberate re-add can import again', () => {
  let state = rootReducer(undefined, guestArticlesAdded([item(1), item(1), item(2)]));
  state = rootReducer(state, guestOrderChanged([2, 1]));
  state = rootReducer(
    state,
    guestImportRecorded({
      owner: 'learner-a',
      receipt: { bookmarks: { 1: addedAt }, progress: {} },
    }),
  );
  state = rootReducer(state, accountSwitched());
  expect(state.guestLibrary.order).toEqual([2, 1]);
  const pending = (owner: string) =>
    pendingGuestBookmarks(state.guestLibrary.bookmarks, state.guestLibrary.imported[owner]).map(
      row => row.article_id,
    );
  expect(pending('learner-a')).toEqual([2]);
  expect(pending('learner-b')).toEqual([1, 2]);
  state = rootReducer(state, guestArticleRemoved(1));
  state = rootReducer(state, guestArticlesAdded([item(1, '2026-11-25T12:00:00Z')]));
  expect(pending('learner-a')).toEqual([1, 2]);
});

test('device reading settings survive the account boundary and only forward progress imports', () => {
  const id = articleId(42);
  let state = rootReducer(undefined, setArabicFontSize(31));
  state = rootReducer(state, setDailyWordLimit(3));
  state = rootReducer(state, guestProgressAdvanced(guestProgressRow(id, 6, 10, addedAt)));
  state = rootReducer(state, guestProgressAdvanced(guestProgressRow(id, 2, 10, addedAt)));
  state = rootReducer(
    state,
    guestImportRecorded({
      owner: 'learner-a',
      receipt: { bookmarks: {}, progress: { [id]: 6 } },
    }),
  );
  state = rootReducer(state, accountSwitched());
  expect(state.settings.arabicFontSize).toBe(31);
  expect(state.settings.dailyWordLimit).not.toBe(3);
  expect(state.guestLibrary.progress[id]?.last_sentence_read).toBe(6);
  expect(
    pendingGuestProgress(state.guestLibrary.progress, state.guestLibrary.imported['learner-a']),
  ).toEqual([]);
  state = rootReducer(state, guestProgressAdvanced(guestProgressRow(id, 8, 10, addedAt)));
  expect(
    pendingGuestProgress(state.guestLibrary.progress, state.guestLibrary.imported['learner-a']),
  ).toMatchObject([{ article_id: id, last_sentence_read: 8 }]);
});
