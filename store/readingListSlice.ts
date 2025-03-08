import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Article } from '../types/articles.types';
import { readingListService } from '../services/readingList';
import { supabase } from '../services/supabase';

interface ReadingListState {
  inProgressArticles: Article[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: ReadingListState = {
  inProgressArticles: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Helper function to check if user is authenticated
const checkUserAuthenticated = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('User is not authenticated');
  return data.session.user;
};

// Async thunks
export const fetchInProgressArticles = createAsyncThunk(
  'readingList/fetchInProgressArticles',
  async (_, { rejectWithValue }) => {
    try {
      // Check if user is authenticated first
      await checkUserAuthenticated();

      const articles = await readingListService.getInProgressArticles();
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
      // Check if user is authenticated first
      await checkUserAuthenticated();

      await readingListService.addToReadingList(articleId);

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
      // Check if user is authenticated first
      await checkUserAuthenticated();

      await readingListService.incrementReadCount(articleId);

      // Refresh the list after incrementing read count
      dispatch(fetchInProgressArticles());
      return articleId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const readingListSlice = createSlice({
  name: 'readingList',
  initialState,
  reducers: {
    clearReadingList: state => {
      state.inProgressArticles = [];
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
      });
  },
});

export const { clearReadingList } = readingListSlice.actions;
export default readingListSlice.reducer;
