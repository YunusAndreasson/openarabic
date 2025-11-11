/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { renderHook } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { useMountSafety } from '@/hooks/common/useMountSafety';

describe('useMountSafety', () => {
  test('should return a ref that is true when mounted', () => {
    const { result } = renderHook(() => useMountSafety());

    expect(result.current.current).toBe(true);
  });

  test('should set ref to false when component unmounts', () => {
    const { result, unmount } = renderHook(() => useMountSafety());

    expect(result.current.current).toBe(true);

    unmount();

    expect(result.current.current).toBe(false);
  });

  test('should maintain same ref instance across re-renders', () => {
    const { result, rerender } = renderHook(() => useMountSafety());

    const firstRef = result.current;

    rerender();

    expect(result.current).toBe(firstRef);
    expect(result.current.current).toBe(true);
  });

  test('should be true immediately after mount', () => {
    const { result } = renderHook(() => useMountSafety());

    // Should be true right away, not waiting for effect
    expect(result.current.current).toBe(true);
  });

  test('should prevent state updates after unmount (practical example)', () => {
    const { result, unmount } = renderHook(() => useMountSafety());

    const isMountedRef = result.current;
    let updateResult = '';

    // Simulate async operation
    setTimeout(() => {
      // Check before updating state
      if (isMountedRef.current) {
        updateResult = 'updated';
      } else {
        updateResult = 'skipped';
      }
    }, 100);

    // Unmount immediately (before timeout completes)
    unmount();

    // Verify ref is now false
    expect(isMountedRef.current).toBe(false);
    expect(updateResult).toBe(''); // Not set yet because timeout hasn't run
  });

  test('should allow state updates when still mounted (practical example)', () => {
    const { result } = renderHook(() => useMountSafety());

    const isMountedRef = result.current;

    // Component is still mounted, ref should be true
    expect(isMountedRef.current).toBe(true);

    // Simulate checking before state update
    const shouldUpdate = isMountedRef.current;

    // Should allow update because component is still mounted
    expect(shouldUpdate).toBe(true);
  });

  test('should handle multiple mount/unmount cycles', () => {
    const { result, unmount, rerender } = renderHook(() => useMountSafety());

    expect(result.current.current).toBe(true);

    unmount();
    expect(result.current.current).toBe(false);

    // Re-render after unmount doesn't remount in this test setup
    // This just verifies ref state is stable after unmount
    rerender();
    expect(result.current.current).toBe(false);
  });

  test('should work correctly in cleanup scenarios', () => {
    let isMountedRef: { current: boolean } | null = null;

    const { unmount } = renderHook(() => {
      const ref = useMountSafety();
      isMountedRef = ref;
      return ref;
    });

    expect(isMountedRef?.current).toBe(true);

    unmount();

    expect(isMountedRef?.current).toBe(false);
  });
});
