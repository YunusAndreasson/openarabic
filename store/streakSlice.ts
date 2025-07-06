import { createSlice } from '@reduxjs/toolkit';

export interface StreakState {
  isBottomSheetVisible: boolean;
}

const initialState: StreakState = {
  isBottomSheetVisible: false,
};

const streakSlice = createSlice({
  name: 'streak',
  initialState,
  reducers: {
    openStreakBottomSheet: state => {
      state.isBottomSheetVisible = true;
    },
    closeStreakBottomSheet: state => {
      state.isBottomSheetVisible = false;
    },
  },
});

export const { openStreakBottomSheet, closeStreakBottomSheet } = streakSlice.actions;
export default streakSlice.reducer;
