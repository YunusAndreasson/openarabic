import reducer, {
  clearAllFilters,
  type FilterState,
  setDateRange,
  setDifficultyRange,
  setSortField,
  toggleAuthor,
} from '../../store/filtersSlice';

describe('filtersSlice reducers', () => {
  let initialState: FilterState;

  beforeEach(() => {
    initialState = {
      sort: { field: 'progress', direction: 'desc' },
      filters: { authorIds: [], difficultyRange: [1, 5], dateRange: 'all' },
    };
  });

  it('toggles sort direction when same field is selected', () => {
    const state = reducer(initialState, setSortField('progress'));
    expect(state.sort.field).toBe('progress');
    expect(state.sort.direction).toBe('asc');
  });

  it('sets sort field with correct default direction', () => {
    const state = reducer(initialState, setSortField('author'));
    expect(state.sort.field).toBe('author');
    expect(state.sort.direction).toBe('asc');

    const next = reducer(initialState, setSortField('difficulty'));
    expect(next.sort.field).toBe('difficulty');
    expect(next.sort.direction).toBe('desc');
  });

  describe('toggleAuthor', () => {
    const ids = [42, 7];
    test.each(ids)('adds and removes author id %p', id => {
      let state = reducer(initialState, toggleAuthor(id));
      expect(state.filters.authorIds).toEqual([id]);

      state = reducer(state, toggleAuthor(id));
      expect(state.filters.authorIds).toEqual([]);
    });
  });

  describe('setDifficultyRange', () => {
    const ranges: [number, number][] = [
      [2, 4],
      [1, 3],
    ];
    test.each(ranges)('sets difficulty range %p', range => {
      const state = reducer(initialState, setDifficultyRange(range));
      expect(state.filters.difficultyRange).toEqual(range);
    });
  });

  describe('setDateRange', () => {
    const ranges: FilterState['filters']['dateRange'][] = ['week', 'month'];
    test.each(ranges)('sets date range %p', range => {
      const state = reducer(initialState, setDateRange(range));
      expect(state.filters.dateRange).toBe(range);
    });
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
