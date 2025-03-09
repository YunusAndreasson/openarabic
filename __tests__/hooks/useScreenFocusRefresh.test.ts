import { renderHook } from '@testing-library/react-hooks';
import { useScreenFocusRefresh } from '../../hooks/useScreenFocusRefresh';
import { useFocusEffect } from '@react-navigation/native';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(callback => callback()),
}));

describe('useScreenFocusRefresh', () => {
  let mockQueryClient: any;

  beforeEach(() => {
    // Create mock query client
    mockQueryClient = {
      getQueryState: jest.fn(),
      invalidateQueries: jest.fn(),
    };

    // Reset mocks
    (useFocusEffect as jest.Mock).mockClear();
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

    const { rerender } = renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true)
    );

    // First render skips due to skipInitialFocus
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();

    // Simulate second focus
    (useFocusEffect as jest.Mock).mockImplementationOnce(cb => cb());
    rerender();

    // Should not refresh as data is fresh
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('should refresh if data is stale', () => {
    mockQueryClient.getQueryState.mockReturnValue({ dataUpdatedAt: Date.now() - 70000 });

    const { rerender } = renderHook(() =>
      useScreenFocusRefresh(mockQueryClient, 'testQuery', 'user123', 60000, true)
    );

    // First render skips due to skipInitialFocus
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();

    // Simulate second focus
    (useFocusEffect as jest.Mock).mockImplementationOnce(cb => cb());
    rerender();

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
    result.current.refreshData();

    // Should refresh regardless of stale time
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testQuery', 'user123'],
    });
  });
});
