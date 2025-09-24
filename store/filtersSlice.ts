import type { PayloadAction } from '@reduxjs/toolkit';
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
  reducers: {
    toggleAuthor: (state, action: PayloadAction<number>) => {
      const authorId = action.payload;
      const index = state.filters.authorIds.indexOf(authorId);

      if (index >= 0) {
        state.filters.authorIds.splice(index, 1);
      } else {
        state.filters.authorIds.push(authorId);
      }
    },

    clearAuthors: state => {
      state.filters.authorIds = [];
    },

    setDifficultyRange: (state, action: PayloadAction<[number, number]>) => {
      state.filters.difficultyRange = action.payload;
    },

    setDateRange: (state, action: PayloadAction<FilterState['filters']['dateRange']>) => {
      state.filters.dateRange = action.payload;
    },

    clearAllFilters: state => {
      state.filters = initialState.filters;
    },
  },
});

export const { toggleAuthor, clearAuthors, setDifficultyRange, setDateRange, clearAllFilters } =
  filtersSlice.actions;

export default filtersSlice.reducer;
