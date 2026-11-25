import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ReadingProgress } from '@/services/readingProgress';
import type { BookmarkItem } from '@/types/bookmark.types';

export interface GuestImportReceipt {
  bookmarks: Record<number, string>;
  progress: Record<number, number>;
}

interface GuestLibraryState {
  bookmarks: BookmarkItem[];
  order: number[];
  progress: Record<number, ReadingProgress>;
  imported: Record<string, GuestImportReceipt>;
}

const initialState: GuestLibraryState = {
  bookmarks: [],
  order: [],
  progress: {},
  imported: {},
};

const guestLibrary = createSlice({
  name: 'guestLibrary',
  initialState,
  reducers: {
    guestArticlesAdded(state, { payload }: PayloadAction<BookmarkItem[]>) {
      const saved = new Set(state.bookmarks.map(item => item.article_id));
      const additions = payload.filter(item => {
        if (saved.has(item.article_id)) return false;
        saved.add(item.article_id);
        return true;
      });
      state.bookmarks.unshift(...additions);
    },
    guestArticleRemoved(state, { payload }: PayloadAction<number>) {
      state.bookmarks = state.bookmarks.filter(item => item.article_id !== payload);
      state.order = state.order.filter(id => id !== payload);
    },
    guestOrderChanged(state, { payload }: PayloadAction<number[]>) {
      state.order = payload;
    },
    guestProgressAdvanced(state, { payload }: PayloadAction<ReadingProgress>) {
      const previous = state.progress[payload.article_id];
      if (!previous || payload.last_sentence_read > previous.last_sentence_read) {
        state.progress[payload.article_id] = payload;
      }
    },
    guestProgressReset(state) {
      state.progress = {};
      for (const receipt of Object.values(state.imported)) receipt.progress = {};
    },
    guestImportRecorded(
      state,
      { payload }: PayloadAction<{ owner: string; receipt: GuestImportReceipt }>,
    ) {
      const prior = state.imported[payload.owner];
      state.imported[payload.owner] = {
        bookmarks: { ...prior?.bookmarks, ...payload.receipt.bookmarks },
        progress: { ...prior?.progress, ...payload.receipt.progress },
      };
    },
    guestImportForgotten(state, { payload }: PayloadAction<string>) {
      const { [payload]: _removed, ...remaining } = state.imported;
      state.imported = remaining;
    },
  },
});

export const {
  guestArticlesAdded,
  guestArticleRemoved,
  guestOrderChanged,
  guestProgressAdvanced,
  guestProgressReset,
  guestImportRecorded,
  guestImportForgotten,
} = guestLibrary.actions;
export default guestLibrary.reducer;
