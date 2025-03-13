import { renderHook, act } from '@testing-library/react-hooks';
import { useScreenFocusRefresh } from '../../hooks/useScreenFocusRefresh';
import * as NavigationModule from '@react-navigation/native';

// Store the focus callback outside the mock
let focusCallback: (() => void) | null = null;

// Helper to trigger focus effect manually
const triggerFocusEffect = () => {
  if (focusCallback) {
    focusCallback();
  }
};

// Mock dependencies
jest.mock('@react-navigation/native', () => {
  return {
    useFocusEffect: jest.fn(callback => {
      focusCallback = callback;
      // Execute the callback immediately on mount
      callback();
    }),
  };
});

describe('useScreenFocusRefresh', () => {
  let mockQueryClient: any;

  beforeEach(() => {
    // Create mock query client
    mockQueryClient = {
      getQueryState: jest.fn(),
      invalidateQueries: jest.fn(),
    };

    // Reset mocks
    (NavigationModule.useFocusEffect as jest.Mock).mockClear();
    // Reset the callback
    focusCallback = null;
  });

  test('should not refresh on initial focus if skipInitialFocus is true', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true));

    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should refresh on initial focus if skipInitialFocus is false', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, false));

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });

  test('should not refresh if data is not stale', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true));

    // First render skips due to skipInitialFocus
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();

    // Simulate second focus
    act(() => {
      triggerFocusEffect();
    });

    // Should not refresh as data is fresh
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should refresh if data is stale', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true));

    // First render skips due to skipInitialFocus
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();

    // Simulate second focus
    act(() => {
      triggerFocusEffect();
    });

    // Should refresh as data is stale
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });

  test('should provide refreshData function that forces refresh', () => {
    const { result } = renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true)
    );

    // Call the refreshData function
    act(() => {
      result.current.refreshData();
    });

    // Should refresh regardless of stale time
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });

  test('should not refresh if userId is undefined', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    const { result } = renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', undefined, 60000, false)
    );

    // Should not refresh on initial focus because userId is undefined
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();

    // Call the refreshData function
    act(() => {
      result.current.refreshData();
    });

    // Should not refresh because userId is undefined
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should handle null query data', () => {
    // Mock getQueryState to return null
    mockQueryClient.getQueryState.mockReturnValue(null);

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, false));

    // Should refresh on initial focus because query data is null (considered stale)
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Simulate second focus
    act(() => {
      triggerFocusEffect();
    });

    // Should refresh again because query data is still null
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });

  test('should handle undefined dataUpdatedAt', () => {
    // Mock getQueryState to return an object without dataUpdatedAt
    mockQueryClient.getQueryState.mockReturnValue({ status: 'success' });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, false));

    // Should refresh on initial focus because dataUpdatedAt is undefined (considered stale)
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Simulate second focus
    act(() => {
      triggerFocusEffect();
    });

    // Should refresh again because dataUpdatedAt is still undefined
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });

  test('should handle multiple focus events correctly', () => {
    // First, return fresh data for initial render
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true));

    // First render skips due to skipInitialFocus
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();

    // Now, return stale data for second focus
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    // Simulate second focus - should have stale data
    act(() => {
      triggerFocusEffect();
    });

    // Should refresh as data is stale
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Now, return fresh data for third focus
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() });

    // Simulate third focus - should have fresh data
    act(() => {
      triggerFocusEffect();
    });

    // Should not refresh as data is fresh
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should use different stale times correctly', () => {
    // Test with very short stale time (1ms)
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 2 });

    const { unmount } = renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 1, false)
    );

    // Should refresh on initial focus because data is stale (older than 1ms)
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();
    unmount();

    // Test with very long stale time (1 day)
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 60000 }); // 1 minute old

    renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 86400000, false)
    );

    // Should not refresh on initial focus because data is not stale (less than 1 day old)
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should handle changing query keys', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    const { rerender } = renderHook(
      ({ queryKey }: { queryKey: string }) =>
        useScreenFocusRefresh(mockQueryClient, queryKey, 'user123', 60000, false),
      { initialProps: { queryKey: 'initialQuery' } }
    );

    // Should refresh on initial focus with initial query key
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['initialQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Change query key
    rerender({ queryKey: 'newQuery' });

    // Should refresh with new query key due to the queryKey change
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['newQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Simulate focus with new query key
    act(() => {
      triggerFocusEffect();
    });

    // Should refresh again with new query key
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['newQuery', 'user123'],
    });
  });

  test('should handle changing userId', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    const { rerender } = renderHook(
      ({ userId }: { userId: string | undefined }) =>
        useScreenFocusRefresh(mockQueryClient, 'testQuery', userId, 60000, false),
      { initialProps: { userId: 'user123' } }
    );

    // Should refresh on initial focus with initial userId
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Change userId
    rerender({ userId: 'user456' });

    // Should refresh with new userId due to the userId change
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user456'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Simulate focus with new userId
    act(() => {
      triggerFocusEffect();
    });

    // Should refresh again with new userId
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user456'],
    });
  });

  test('should not refresh when changing to undefined userId', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    type Props = { userId: string | undefined };

    const { rerender } = renderHook(
      ({ userId }: Props) =>
        useScreenFocusRefresh(mockQueryClient, 'testQuery', userId, 60000, false),
      { initialProps: { userId: 'user123' } as Props }
    );

    // Should refresh on initial focus with initial userId
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Change userId to undefined
    rerender({ userId: undefined });

    // Should not refresh because userId is undefined
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should handle error in invalidateQueries gracefully', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    // Mock invalidateQueries to throw an error
    mockQueryClient.invalidateQueries.mockImplementation(() => {
      throw new Error('Test error in invalidateQueries');
    });

    // This should not throw an error
    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, false));

    // invalidateQueries should have been called despite throwing an error
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
  });

  test('should handle empty string userId correctly', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    // Empty string userId should be treated as falsy in the hook
    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', '', 60000, false));

    // Should not invalidate queries with empty string userId (treated as falsy)
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should handle null userId as undefined', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    // @ts-ignore - Testing runtime behavior with null
    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', null, 60000, false));

    // Should not invalidate queries with null userId (treated as falsy)
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should handle extremely large stale time values', () => {
    const veryLargeStaleTime = Number.MAX_SAFE_INTEGER;

    // Mock data that is not stale even with a very large stale time
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() });

    renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', veryLargeStaleTime, false)
    );

    // Should not invalidate queries because data is fresh even with a very large stale time
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should handle extremely small stale time values', () => {
    const verySmallStaleTime = 1; // 1ms

    // Mock data that is stale with a very small stale time
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 2 });

    renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', verySmallStaleTime, false)
    );

    // Should invalidate queries because data is stale with a very small stale time
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });

  test('should handle rapid focus events correctly', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    renderHook(() => useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, false));

    // First focus event should trigger invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(1);

    // Reset mock
    mockQueryClient.invalidateQueries.mockClear();

    // Simulate multiple rapid focus events
    for (let i = 0; i < 5; i++) {
      act(() => {
        triggerFocusEffect();
      });
    }

    // Each focus event should trigger invalidation
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(5);
  });
});
