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
  if (error) {
    console.error('Authentication error:', error);
    throw error;
  }
  if (!data.session) {
    console.log('No active session found');
    throw new Error('User is not authenticated');
  }
  return data.session.user;
};

// Async thunks
export const fetchInProgressArticles = createAsyncThunk(
  'readingList/fetchInProgressArticles',
  async (_, { rejectWithValue }) => {
    try {
      // Check if user is authenticated first
      await checkUserAuthenticated();

      console.log('Fetching in-progress articles');
      const articles = await readingListService.getInProgressArticles();
      console.log(`Fetched ${articles.length} in-progress articles`);
      return articles;
    } catch (error) {
      console.error('Error in fetchInProgressArticles thunk:', error);
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

      console.log('Adding article to reading list in thunk:', articleId);
      await readingListService.addToReadingList(articleId);
      console.log('Successfully added article to reading list, refreshing list');

      // Refresh the list after adding
      dispatch(fetchInProgressArticles());
      return articleId;
    } catch (error) {
      console.error('Error in addToReadingList thunk:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const markAsCompleted = createAsyncThunk(
  'readingList/markAsCompleted',
  async (articleId: number, { dispatch, rejectWithValue }) => {
    try {
      // Check if user is authenticated first
      await checkUserAuthenticated();

      console.log('Marking article as completed in thunk:', articleId);
      await readingListService.markAsCompleted(articleId);
      console.log('Successfully marked article as completed, refreshing list');

      // Refresh the list after marking as completed
      dispatch(fetchInProgressArticles());
      return articleId;
    } catch (error) {
      console.error('Error in markAsCompleted thunk:', error);
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

      console.log('Incrementing read count for article in thunk:', articleId);
      await readingListService.incrementReadCount(articleId);
      console.log('Successfully incremented read count, refreshing list');

      // Refresh the list after incrementing read count
      dispatch(fetchInProgressArticles());
      return articleId;
    } catch (error) {
      console.error('Error in incrementReadCount thunk:', error);
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
        console.error('fetchInProgressArticles rejected with error:', state.error);
      })
      // addToReadingList
      .addCase(addToReadingList.pending, state => {
        state.error = null;
      })
      .addCase(addToReadingList.rejected, (state, action) => {
        state.error = action.payload as string;
        console.error('addToReadingList rejected with error:', state.error);
      })
      // incrementReadCount
      .addCase(incrementReadCount.pending, state => {
        state.error = null;
      })
      .addCase(incrementReadCount.rejected, (state, action) => {
        state.error = action.payload as string;
        console.error('incrementReadCount rejected with error:', state.error);
      });
  },
});

export const { clearReadingList } = readingListSlice.actions;
export default readingListSlice.reducer;
