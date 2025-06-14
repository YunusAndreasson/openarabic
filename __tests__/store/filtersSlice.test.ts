import reducer, {
  type FilterState,
  setSortField,
  toggleAuthor,
  setDifficultyRange,
  setDateRange,
  clearAllFilters,
  selectActiveFiltersCount,
} from '../../store/filtersSlice';

describe('filtersSlice reducers', () => {
  let initialState: FilterState;

  beforeEach(() => {
    initialState = {
      sort: { field: 'date', direction: 'desc' },
      filters: { authorIds: [], difficultyRange: [1, 5], dateRange: 'all' },
    };
  });

  it('toggles sort direction when same field is selected', () => {
    const state = reducer(initialState, setSortField('date'));
    expect(state.sort.field).toBe('date');
    expect(state.sort.direction).toBe('asc');
  });

  it('sets sort field with correct default direction', () => {
    const state = reducer(initialState, setSortField('title'));
    expect(state.sort.field).toBe('title');
    expect(state.sort.direction).toBe('asc');

    const next = reducer(initialState, setSortField('difficulty'));
    expect(next.sort.field).toBe('difficulty');
    expect(next.sort.direction).toBe('desc');
  });

  it('adds and removes author ids', () => {
    let state = reducer(initialState, toggleAuthor(42));
    expect(state.filters.authorIds).toEqual([42]);

    state = reducer(state, toggleAuthor(42));
    expect(state.filters.authorIds).toEqual([]);
  });

  it('sets difficulty range', () => {
    const state = reducer(initialState, setDifficultyRange([2, 4]));
    expect(state.filters.difficultyRange).toEqual([2, 4]);
  });

  it('sets date range', () => {
    const state = reducer(initialState, setDateRange('week'));
    expect(state.filters.dateRange).toBe('week');
  });

  it('clears all filters', () => {
    let state: FilterState = {
      ...initialState,
      filters: { authorIds: [1], difficultyRange: [2, 3], dateRange: 'week' },
    };
    state = reducer(state, clearAllFilters());
    expect(state.filters).toEqual({
      authorIds: [],
      difficultyRange: [1, 5],
      dateRange: 'all',
    });
  });
});

describe('selectActiveFiltersCount', () => {
  let state: { filters: FilterState };

  beforeEach(() => {
    state = {
      filters: {
        sort: { field: 'date', direction: 'desc' },
        filters: { authorIds: [], difficultyRange: [1, 5], dateRange: 'all' },
      },
    };
  });

  it('counts active filters across all categories', () => {
    expect(selectActiveFiltersCount(state)).toBe(0);

    state = {
      filters: {
        ...state.filters,
        filters: { ...state.filters.filters, authorIds: [1] },
      },
    };
    expect(selectActiveFiltersCount(state)).toBe(1);

    state = {
      filters: {
        ...state.filters,
        filters: { ...state.filters.filters, difficultyRange: [2, 5] },
      },
    };
    expect(selectActiveFiltersCount(state)).toBe(2);

    state = {
      filters: {
        ...state.filters,
        filters: { ...state.filters.filters, dateRange: 'week' },
      },
    };
    expect(selectActiveFiltersCount(state)).toBe(3);
  });
});
