import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Article } from '../types/articles.types';
import { readingListService } from '../services/readingList';
import { checkAuthentication } from '../services/supabase';

interface ReadingListState {
  inProgressArticles: Article[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  lastOpenedArticles: Record<number, string>; // Map of article ID to ISO timestamp
}

const initialState: ReadingListState = {
  inProgressArticles: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  lastOpenedArticles: {},
};

// Async thunks
export const fetchInProgressArticles = createAsyncThunk(
  'readingList/fetchInProgressArticles',
  async (_, { rejectWithValue }) => {
    try {
      // Get authenticated user
      const { user } = await checkAuthentication();

      const articles = await readingListService.getInProgressArticles(user.id);
      return articles;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const addToReadingList = createAsyncThunk(
  'readingList/addToReadingList',
  async (articleId: number, { dispatch, rejectWithValue }) => {
    try {
      // Get authenticated user
      const { user } = await checkAuthentication();

      await readingListService.addToReadingList(user.id, articleId);

      // Refresh the list after adding
      dispatch(fetchInProgressArticles());
      return articleId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const incrementReadCount = createAsyncThunk(
  'readingList/incrementReadCount',
  async (articleId: number, { dispatch, rejectWithValue }) => {
    try {
      // Get authenticated user
      const { user } = await checkAuthentication();

      await readingListService.incrementReadCount(user.id, articleId);

      // Refresh the list after incrementing read count
      dispatch(fetchInProgressArticles());
      return articleId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateLastOpenedArticle = createAsyncThunk(
  'readingList/updateLastOpenedArticle',
  async (articleId: number) => {
    // No need to check authentication or make API calls
    // Just return the article ID and current timestamp
    return {
      articleId,
      timestamp: new Date().toISOString(),
    };
  }
);

const readingListSlice = createSlice({
  name: 'readingList',
  initialState,
  reducers: {
    clearReadingList: state => {
      state.inProgressArticles = [];
      // Keep lastOpenedArticles intact
    },
  },
  extraReducers: builder => {
    builder
      // fetchInProgressArticles
      .addCase(fetchInProgressArticles.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInProgressArticles.fulfilled, (state, action: PayloadAction<Article[]>) => {
        state.isLoading = false;
        state.inProgressArticles = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchInProgressArticles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // addToReadingList
      .addCase(addToReadingList.pending, state => {
        state.error = null;
      })
      .addCase(addToReadingList.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // incrementReadCount
      .addCase(incrementReadCount.pending, state => {
        state.error = null;
      })
      .addCase(incrementReadCount.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // updateLastOpenedArticle
      .addCase(updateLastOpenedArticle.fulfilled, (state, action) => {
        const { articleId, timestamp } = action.payload;
        state.lastOpenedArticles[articleId] = timestamp;
      });
  },
});

export const { clearReadingList } = readingListSlice.actions;
export default readingListSlice.reducer;
