import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createSelector } from '@reduxjs/toolkit';

export interface FilterState {
  sort: {
    field: 'title' | 'author' | 'date' | 'difficulty';
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
    field: 'date',
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
        // Smart defaults: date/difficulty start with 'desc' (newest/hardest first)
        // Title/author start with 'asc' (A-Z)
        state.sort.direction =
          action.payload === 'date' || action.payload === 'difficulty' ? 'desc' : 'asc';
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
  (state: { filters: FilterState }) => state.filters.filters,
  filters => {
    let count = 0;
    if (filters.authorIds.length > 0) count++;
    if (filters.difficultyRange[0] > 1 || filters.difficultyRange[1] < 5) count++;
    if (filters.dateRange !== 'all') count++;
    return count;
  }
);

export const { setSortField, toggleAuthor, setDifficultyRange, setDateRange, clearAllFilters } =
  filtersSlice.actions;

export default filtersSlice.reducer;
