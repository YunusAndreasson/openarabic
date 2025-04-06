import { createSlice } from '@reduxjs/toolkit';

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

// Type for actions that include a payload
type Action<P> = {
  payload: P;
  type: string;
};

const featuredContentSlice = createSlice({
  name: 'featuredContent',
  initialState,
  reducers: {
    setDailyPick: (state, action: Action<{ articleId: number; date: string }>) => {
      state.dailyPick = action.payload;
    },
  },
});

export const { setDailyPick } = featuredContentSlice.actions;
export default featuredContentSlice.reducer;
