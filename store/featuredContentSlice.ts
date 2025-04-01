import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FeaturedContentState {
  dailyPick: {
    articleId: number | null;
    date: string | null;
  };
  featuredArticles: {
    ids: number[];
    lastUpdated: string | null;
  };
}

const initialState: FeaturedContentState = {
  dailyPick: {
    articleId: null,
    date: null,
  },
  featuredArticles: {
    ids: [],
    lastUpdated: null,
  },
};

const featuredContentSlice = createSlice({
  name: 'featuredContent',
  initialState,
  reducers: {
    setDailyPick: (state, action: PayloadAction<{ articleId: number; date: string }>) => {
      state.dailyPick = action.payload;
    },
    setFeaturedArticles: (state, action: PayloadAction<{ ids: number[]; lastUpdated: string }>) => {
      state.featuredArticles = action.payload;
    },
  },
});

export const { setDailyPick, setFeaturedArticles } = featuredContentSlice.actions;
export default featuredContentSlice.reducer;
