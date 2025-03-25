import { renderHook, act } from '@testing-library/react-hooks';
import { useLoadingState } from '../../hooks/useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dataLoaded).toBe(false);
  });

  test('should initialize with provided initial state', () => {
    const { result } = renderHook(() => useLoadingState(500, false));

    expect(result.current.isLoading).toBe(false);
  });

  test('should start loading when startLoading is called', () => {
    const { result } = renderHook(() => useLoadingState(500, false));

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dataLoaded).toBe(false);
  });

  test('should respect minimum loading time', () => {
    // Mock Date.now to control time
    const originalDateNow = Date.now;
    const mockTime = 1000;
    Date.now = jest.fn(() => mockTime);

    const { result } = renderHook(() => useLoadingState(500, true));

    // Call stopLoading
    act(() => {
      result.current.stopLoading();
    });

    // Advance mock time by 300ms
    Date.now = jest.fn(() => mockTime + 300);

    // Should still be loading because minimum time hasn't passed
    expect(result.current.isLoading).toBe(true);

    // Advance mock time by another 200ms (total 500ms)
    Date.now = jest.fn(() => mockTime + 500);

    // Run the timeout
    act(() => {
      jest.runAllTimers();
    });

    // Now it should be done loading
    expect(result.current.isLoading).toBe(false);

    // Restore original Date.now
    Date.now = originalDateNow;
  });

  test('should set data loaded state', () => {
    const { result } = renderHook(() => useLoadingState());

    // Initially data loaded should be false
    expect(result.current.dataLoaded).toBe(false);

    // Set data loaded to true
    act(() => {
      result.current.setDataLoaded(true);
    });

    // Now data loaded should be true
    expect(result.current.dataLoaded).toBe(true);
  });

  test('should reset state correctly', () => {
    const { result } = renderHook(() => useLoadingState(500, true));

    // Change the state
    act(() => {
      result.current.stopLoading();
      jest.runAllTimers();
      result.current.setDataLoaded(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.dataLoaded).toBe(true);

    // Reset the state
    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dataLoaded).toBe(false);
  });
});
