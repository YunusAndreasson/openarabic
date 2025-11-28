import { createSlice } from '@reduxjs/toolkit';

export interface FilterState {
  filters: {
    authorIds: number[];
    difficultyRange: [number, number]; // [min, max] from 1-5
    dateRange: 'week' | 'month' | 'all';
  };
}

const initialState: FilterState = {
  filters: {
    authorIds: [],
    difficultyRange: [1, 5], // All difficulties by default
    dateRange: 'all',
  },
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {},
});

export default filtersSlice.reducer;
