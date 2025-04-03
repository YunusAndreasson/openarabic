import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FeaturedContentState {
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
  },
});

export const { setDailyPick } = featuredContentSlice.actions;
export default featuredContentSlice.reducer;
