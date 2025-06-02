import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FeaturedContentState {
  featured: {
    articleId: number | null;
    date: string | null;
  };
  // Keep dailyPick as an alias for backward compatibility
  dailyPick: {
    articleId: number | null;
    date: string | null;
  };
}

const initialState: FeaturedContentState = {
  featured: {
    articleId: null,
    date: null,
  },
  dailyPick: {
    articleId: null,
    date: null,
  },
};

const featuredContentSlice = createSlice({
  name: 'featuredContent',
  initialState,
  reducers: {
    setDailyPick: (state, action: PayloadAction<{ articleId: number; date: string }>) => {
      // Update both featured and dailyPick for compatibility
      state.featured = action.payload;
      state.dailyPick = action.payload;
    },
    clearDailyPick: state => {
      const cleared = {
        articleId: null,
        date: null,
      };
      state.featured = cleared;
      state.dailyPick = cleared;
    },
    setFeatured: (state, action: PayloadAction<{ articleId: number; date: string }>) => {
      state.featured = action.payload;
      state.dailyPick = action.payload; // Keep in sync
    },
    clearFeatured: state => {
      const cleared = {
        articleId: null,
        date: null,
      };
      state.featured = cleared;
      state.dailyPick = cleared;
    },
  },
});

export const { setDailyPick, clearDailyPick, setFeatured, clearFeatured } =
  featuredContentSlice.actions;
export default featuredContentSlice.reducer;
