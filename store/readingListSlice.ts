import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Only keep lastOpenedArticles for local tracking
export interface ReadingListState {
  lastOpenedArticles: Record<number, string>; // Map of article ID to ISO timestamp
}

const initialState: ReadingListState = {
  lastOpenedArticles: {},
};

// Thunk to update last opened timestamp for an article
export const updateLastOpenedArticle = createAsyncThunk(
  'readingList/updateLastOpenedArticle',
  async (articleId: number) => {
    return {
      articleId,
      timestamp: new Date().toISOString(),
    };
  }
);

const readingListSlice = createSlice({
  name: 'readingList',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(updateLastOpenedArticle.fulfilled, (state, action) => {
      const { articleId, timestamp } = action.payload;
      state.lastOpenedArticles[articleId] = timestamp;
    });
  },
});

export default readingListSlice.reducer;
