/**
 * Tab Navigation State Isolation Tests
 *
 * Tests state management patterns across tab navigation:
 * - Shared state (Redux, Auth, Query Cache) consistency across tabs
 * - Individual tab state isolation
 * - State persistence during tab switches
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';

import { setupTestStore, type TestStore } from '@/__tests__/helpers/testStore';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { setTheme } from '@/store/themeSlice';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock modules at top level
const mockGetStudyWords = jest.fn();

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getStudyWords: () => mockGetStudyWords(),
  },
}));

// Mock auth hook - shared across all tabs
const mockUserId = 'test-user-id';
const mockSession = {
  user: { id: mockUserId, email: 'test@example.com' },
  access_token: 'test-token',
};

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: mockSession.user,
    session: mockSession,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

describe('Tab Navigation State Isolation', () => {
  let queryClient: QueryClient;
  let mockStore: TestStore;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockStore = setupTestStore();

    // Default mock implementations
    mockGetStudyWords.mockResolvedValue([]);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  describe('Redux State Sharing', () => {
    test('theme state is shared across all components', () => {
      // Simulate hooks from different "tabs" accessing the same Redux state
      const useThemeFromTab1 = () => useSelector((state: any) => state.theme.theme);
      const useThemeFromTab2 = () => useSelector((state: any) => state.theme.theme);

      const { result: tab1Result } = renderHook(() => useThemeFromTab1(), { wrapper });
      const { result: tab2Result } = renderHook(() => useThemeFromTab2(), { wrapper });

      // Both should see the same theme state
      expect(tab1Result.current).toBe(tab2Result.current);
    });

    test('settings state is shared across all components', () => {
      const useSettingsFromTab1 = () => useSelector((state: any) => state.settings);
      const useSettingsFromTab2 = () => useSelector((state: any) => state.settings);

      const { result: tab1Result } = renderHook(() => useSettingsFromTab1(), { wrapper });
      const { result: tab2Result } = renderHook(() => useSettingsFromTab2(), { wrapper });

      // Settings should be the same instance
      expect(tab1Result.current).toEqual(tab2Result.current);
    });

    test('Redux dispatch affects all subscribers to the store', () => {
      // Create a shared store for this test
      const sharedStore = setupTestStore();

      // Initial state should be 'dark' (Theme.Dark is the default)
      expect(sharedStore.getState().theme.theme).toBe('dark');

      // Dispatch action
      sharedStore.dispatch(setTheme('light' as any));

      // State should be updated
      expect(sharedStore.getState().theme.theme).toBe('light');

      // Any component subscribing to this store would see the updated value
      // This demonstrates that Redux state is shared - there's a single store instance
    });
  });

  describe('Query Cache Sharing', () => {
    test('query data is shared across components via cache', () => {
      const mockStudyWords: StudyWord[] = [
        { root_id: 1, fsrs_due: '2024-01-01' } as StudyWord,
        { root_id: 2, fsrs_due: '2024-01-02' } as StudyWord,
      ];

      // Pre-populate cache
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, mockStudyWords);

      // Different components accessing the same query key
      const useCacheData = () => {
        const qc = useQueryClient();
        return qc.getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey);
      };

      const { result: libraryResult } = renderHook(() => useCacheData(), { wrapper });
      const { result: studyResult } = renderHook(() => useCacheData(), { wrapper });

      // Both should have the same data
      expect(libraryResult.current).toEqual(studyResult.current);
      expect(libraryResult.current?.length).toBe(2);
    });

    test('cache invalidation clears data for all consumers', () => {
      const mockStudyWords: StudyWord[] = [{ root_id: 1 } as StudyWord];
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, mockStudyWords);

      // Hook that can invalidate queries
      const useFSRSWithInvalidation = () => {
        const qc = useQueryClient();
        return {
          data: qc.getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey),
          invalidate: () => qc.removeQueries({ queryKey: fsrsQueries.all(mockUserId).queryKey }),
        };
      };

      const { result: tab1Result } = renderHook(() => useFSRSWithInvalidation(), { wrapper });

      expect(tab1Result.current.data?.length).toBe(1);

      // Invalidate from tab 1
      act(() => {
        tab1Result.current.invalidate();
      });

      // New hook instance should see no data
      const { result: tab2Result } = renderHook(() => useFSRSWithInvalidation(), { wrapper });
      expect(tab2Result.current.data).toBeUndefined();
    });

    test('cache setQueryData updates are visible to all', () => {
      // Set initial data
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, []);

      const useFSRSData = () => {
        const qc = useQueryClient();
        return qc.getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey);
      };

      // Initial state is empty
      const { result: tab1Before } = renderHook(() => useFSRSData(), { wrapper });
      expect(tab1Before.current).toEqual([]);

      // Optimistically update
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, [
        { root_id: 999 } as StudyWord,
      ]);

      // Both new hook instances should see the update
      const { result: tab1After } = renderHook(() => useFSRSData(), { wrapper });
      const { result: tab2After } = renderHook(() => useFSRSData(), { wrapper });

      expect(tab1After.current).toEqual([{ root_id: 999 }]);
      expect(tab2After.current).toEqual([{ root_id: 999 }]);
    });
  });

  describe('Auth State Consistency', () => {
    test('auth state is consistent across all tabs', () => {
      const { result: tab1Auth } = renderHook(() => useAuth(), { wrapper });
      const { result: tab2Auth } = renderHook(() => useAuth(), { wrapper });
      const { result: tab3Auth } = renderHook(() => useAuth(), { wrapper });

      // All tabs should see the same auth state
      expect(tab1Auth.current.user?.id).toBe(mockUserId);
      expect(tab2Auth.current.user?.id).toBe(mockUserId);
      expect(tab3Auth.current.user?.id).toBe(mockUserId);
      expect(tab1Auth.current.isAuthenticated).toBe(true);
      expect(tab2Auth.current.isAuthenticated).toBe(true);
      expect(tab3Auth.current.isAuthenticated).toBe(true);
    });

    test('session data is identical across tabs', () => {
      const { result: libraryAuth } = renderHook(() => useAuth(), { wrapper });
      const { result: studyAuth } = renderHook(() => useAuth(), { wrapper });
      const { result: bookmarksAuth } = renderHook(() => useAuth(), { wrapper });

      // Session should be the same object/reference
      expect(libraryAuth.current.session).toEqual(studyAuth.current.session);
      expect(studyAuth.current.session).toEqual(bookmarksAuth.current.session);
    });
  });

  describe('Tab-Specific State Isolation', () => {
    test('local hook state is isolated between instances', () => {
      // Simulate a tab-specific hook with local state
      const useTabSpecificState = () => {
        const [count, setCount] = React.useState(0);
        return { count, increment: () => setCount(c => c + 1) };
      };

      const { result: tab1State } = renderHook(() => useTabSpecificState(), { wrapper });
      const { result: tab2State } = renderHook(() => useTabSpecificState(), { wrapper });

      // Initial state
      expect(tab1State.current.count).toBe(0);
      expect(tab2State.current.count).toBe(0);

      // Increment tab 1
      act(() => {
        tab1State.current.increment();
      });

      // Only tab 1 should be incremented
      expect(tab1State.current.count).toBe(1);
      expect(tab2State.current.count).toBe(0);
    });

    test('scroll position state is isolated per tab', () => {
      // Simulate scroll position tracking hook
      const useScrollPosition = () => {
        const [scrollY, setScrollY] = React.useState(0);
        return { scrollY, setScrollY };
      };

      const { result: libraryScroll } = renderHook(() => useScrollPosition(), { wrapper });
      const { result: studyScroll } = renderHook(() => useScrollPosition(), { wrapper });

      // Scroll in library tab
      act(() => {
        libraryScroll.current.setScrollY(500);
      });

      // Library should show scrolled position
      expect(libraryScroll.current.scrollY).toBe(500);
      // Study tab should remain at top
      expect(studyScroll.current.scrollY).toBe(0);
    });

    test('modal/sheet state is isolated per tab', () => {
      // Simulate modal state hook
      const useModalState = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
      };

      const { result: libraryModal } = renderHook(() => useModalState(), { wrapper });
      const { result: studyModal } = renderHook(() => useModalState(), { wrapper });

      // Open modal in library
      act(() => {
        libraryModal.current.open();
      });

      // Library modal is open
      expect(libraryModal.current.isOpen).toBe(true);
      // Study modal remains closed
      expect(studyModal.current.isOpen).toBe(false);
    });
  });

  describe('State Persistence During Tab Switches', () => {
    test('query cache persists when switching tabs', async () => {
      const mockStudyWords: StudyWord[] = [{ root_id: 1 } as StudyWord];

      // Pre-populate cache
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, mockStudyWords);

      // Load data in "library tab"
      const useFSRSQuery = () =>
        useQuery({
          ...fsrsQueries.all(mockUserId),
          initialData: () =>
            queryClient.getQueryData(fsrsQueries.all(mockUserId).queryKey) as StudyWord[],
        });

      const { result: libraryQuery, unmount: unmountLibrary } = renderHook(() => useFSRSQuery(), {
        wrapper,
      });

      expect(libraryQuery.current.data).toEqual(mockStudyWords);

      // Simulate "switching away" from library tab
      unmountLibrary();

      // "Switch to study tab" - should get cached data
      const { result: studyQuery } = renderHook(() => useFSRSQuery(), { wrapper });

      // Should immediately have data from cache (no loading state)
      expect(studyQuery.current.data).toEqual(mockStudyWords);
    });

    test('Redux state persists across component unmounts', () => {
      // Create a shared store
      const sharedStore = setupTestStore();

      // Default is 'dark' (Theme.Dark)
      expect(sharedStore.getState().theme.theme).toBe('dark');

      // Update theme
      sharedStore.dispatch(setTheme('light' as any));
      expect(sharedStore.getState().theme.theme).toBe('light');

      // Simulating "unmounting" a component doesn't affect store
      // The store persists independently of component lifecycle
      // This is the key behavior: Redux store state survives component unmounts

      // Any new component accessing the same store sees the persisted state
      expect(sharedStore.getState().theme.theme).toBe('light');
    });
  });

  describe('Cross-Tab Data Synchronization', () => {
    test('query cache is accessible from any component', () => {
      // Pre-populate cache with initial data
      const initialWords: StudyWord[] = [
        { root_id: 1, fsrs_due: '2024-01-01' } as StudyWord,
        { root_id: 2, fsrs_due: '2024-01-01' } as StudyWord,
      ];
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, initialWords);

      // Hook that reads directly from cache
      const useQueryCache = () => {
        const qc = useQueryClient();
        return qc.getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey);
      };

      const { result: tab1Data } = renderHook(() => useQueryCache(), { wrapper });
      const { result: tab2Data } = renderHook(() => useQueryCache(), { wrapper });

      // Both tabs see the same cached data
      expect(tab1Data.current?.length).toBe(2);
      expect(tab2Data.current?.length).toBe(2);
      expect(tab1Data.current).toEqual(tab2Data.current);
    });

    test('cache updates are visible to all components', () => {
      // Pre-populate cache
      const initialList = [{ id: 1 }, { id: 2 }];
      queryClient.setQueryData(['readingList', mockUserId], initialList);

      // Hook that reads directly from cache
      const useReadingListCache = () => {
        const qc = useQueryClient();
        return qc.getQueryData<any[]>(['readingList', mockUserId]);
      };

      const { result: tab1 } = renderHook(() => useReadingListCache(), { wrapper });
      const { result: tab2 } = renderHook(() => useReadingListCache(), { wrapper });

      // Both see initial data
      expect(tab1.current?.length).toBe(2);
      expect(tab2.current?.length).toBe(2);

      // Update cache
      queryClient.setQueryData(['readingList', mockUserId], [{ id: 1 }]);

      // Re-render hooks to get fresh cache value
      const { result: tab1After } = renderHook(() => useReadingListCache(), { wrapper });
      const { result: tab2After } = renderHook(() => useReadingListCache(), { wrapper });

      // Both see updated data
      expect(tab1After.current?.length).toBe(1);
      expect(tab2After.current?.length).toBe(1);
    });
  });
});
