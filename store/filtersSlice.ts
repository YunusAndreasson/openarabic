import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector, createSlice } from '@reduxjs/toolkit';

export interface FilterState {
  sort: {
    field: 'author' | 'date' | 'difficulty' | 'progress';
    direction: 'asc' | 'desc';
  };
  filters: {
    authorIds: number[];
    difficultyRange: [number, number]; // [min, max] from 1-5
    dateRange: 'week' | 'month' | 'all';
  };
}

const initialState: FilterState = {
  sort: {
    field: 'progress',
    direction: 'desc',
  },
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
    setSortField: (state, action: PayloadAction<FilterState['sort']['field']>) => {
      if (state.sort.field === action.payload) {
        // Toggle direction if same field
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // Change field and use smart default direction based on field type
        state.sort.field = action.payload;
        // Smart defaults: date/difficulty/progress start with 'desc' (newest/hardest/most progress first)
        // Author starts with 'asc' (A-Z)
        state.sort.direction =
          action.payload === 'date' ||
          action.payload === 'difficulty' ||
          action.payload === 'progress'
            ? 'desc'
            : 'asc';
      }
    },

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

// Computed selector for active filters count
export const selectActiveFiltersCount = createSelector(
  (state: { filters: FilterState }) => state.filters?.filters,
  filters => {
    if (!filters) return 0;

    let count = 0;
    if (filters.authorIds.length > 0) count++;
    if (filters.difficultyRange[0] > 1 || filters.difficultyRange[1] < 5) count++;
    if (filters.dateRange !== 'all') count++;
    return count;
  }
);

export const {
  setSortField,
  toggleAuthor,
  clearAuthors,
  setDifficultyRange,
  setDateRange,
  clearAllFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;
