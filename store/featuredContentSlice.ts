import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FeaturedContentState {
  dailyPick: {
    articleId: number | null;
    date: string | null;
  };
}

const initialState: FeaturedContentState = {
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
      state.dailyPick = action.payload;
    },
    clearDailyPick: state => {
      state.dailyPick = {
        articleId: null,
        date: null,
      };
    },
  },
});

export const { setDailyPick, clearDailyPick } = featuredContentSlice.actions;
export default featuredContentSlice.reducer;
