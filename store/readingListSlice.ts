import { createSlice } from '@reduxjs/toolkit';

// Only keep lastOpenedArticles for local tracking
export interface ReadingListState {
  lastOpenedArticles: Record<number, string>; // Map of article ID to ISO timestamp
}

const initialState: ReadingListState = {
  lastOpenedArticles: {},
};

// Action to update last opened timestamp for an article
const readingListSlice = createSlice({
  name: 'readingList',
  initialState,
  reducers: {
    updateLastOpenedArticle: (state, action: { payload: number }) => {
      state.lastOpenedArticles[action.payload] = new Date().toISOString();
    },
  },
});

export const { updateLastOpenedArticle } = readingListSlice.actions;

export default readingListSlice.reducer;
