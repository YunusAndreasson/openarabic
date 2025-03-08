import { configureStore, AnyAction } from '@reduxjs/toolkit';
import readingListReducer, {
  clearReadingList,
  fetchInProgressArticles,
  addToReadingList,
  incrementReadCount,
} from '../../store/readingListSlice';
import { readingListService } from '../../services/readingList';

// Import after mocking
import { supabase } from '../../services/supabase';

// Mock the services
jest.mock('../../services/readingList', () => ({
  readingListService: {
    getInProgressArticles: jest.fn(),
    addToReadingList: jest.fn(),
    incrementReadCount: jest.fn(),
  },
}));

// Mock supabase with proper structure
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

describe('readingListSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        readingList: readingListReducer,
      },
    });
  });

  describe('reducers', () => {
    it('should handle initial state', () => {
      const state = store.getState() as { readingList: any };
      expect(state.readingList).toEqual({
        inProgressArticles: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    });

    it('should handle clearReadingList', () => {
      // First add some articles to the state
      store.dispatch({
        type: fetchInProgressArticles.fulfilled.type,
        payload: [{ id: 1, title: 'Test Article' }],
      });

      // Then clear them
      store.dispatch(clearReadingList());

      const state = store.getState() as { readingList: any };
      expect(state.readingList.inProgressArticles).toEqual([]);
    });
  });

  describe('async thunks', () => {
    it('should handle fetchInProgressArticles.fulfilled', async () => {
      const mockArticles = [
        { id: 1, title: 'Article 1' },
        { id: 2, title: 'Article 2' },
      ];

      // Mock the authentication check
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      // Mock the service response
      (readingListService.getInProgressArticles as jest.Mock).mockResolvedValue(mockArticles);

      // Dispatch the action
      await store.dispatch(fetchInProgressArticles() as unknown as AnyAction);

      // Check the resulting state
      const state = store.getState() as { readingList: any };
      expect(state.readingList.inProgressArticles).toEqual(mockArticles);
      expect(state.readingList.isLoading).toBe(false);
      expect(state.readingList.error).toBe(null);
      expect(state.readingList.lastUpdated).toBeTruthy();
    });

    it('should handle fetchInProgressArticles.rejected when user is not authenticated', async () => {
      // Mock authentication failure
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Dispatch the action
      await store.dispatch(fetchInProgressArticles() as unknown as AnyAction);

      // Check the resulting state
      const state = store.getState() as { readingList: any };
      expect(state.readingList.isLoading).toBe(false);
      expect(state.readingList.error).toBe('User is not authenticated');
    });

    it('should handle addToReadingList.fulfilled', async () => {
      // Mock the authentication check
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      // Mock the service response
      (readingListService.addToReadingList as jest.Mock).mockResolvedValue(undefined);

      // Mock the fetchInProgressArticles that gets called after adding
      (readingListService.getInProgressArticles as jest.Mock).mockResolvedValue([
        { id: 1, title: 'Article 1' },
      ]);

      // Dispatch the action
      await store.dispatch(addToReadingList(1) as unknown as AnyAction);

      // Verify the service was called with the correct article ID
      expect(readingListService.addToReadingList).toHaveBeenCalledWith(1);
    });

    it('should handle incrementReadCount.fulfilled', async () => {
      // Mock the authentication check
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      // Mock the service response
      (readingListService.incrementReadCount as jest.Mock).mockResolvedValue(undefined);

      // Mock the fetchInProgressArticles that gets called after incrementing
      (readingListService.getInProgressArticles as jest.Mock).mockResolvedValue([
        { id: 1, title: 'Article 1', readCount: 1 },
      ]);

      // Dispatch the action
      await store.dispatch(incrementReadCount(1) as unknown as AnyAction);

      // Verify the service was called with the correct article ID
      expect(readingListService.incrementReadCount).toHaveBeenCalledWith(1);
    });
  });
});
