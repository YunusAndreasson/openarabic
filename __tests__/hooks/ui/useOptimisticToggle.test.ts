import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { useOptimisticToggle } from '@/hooks/ui/useOptimisticToggle';

describe('useOptimisticToggle', () => {
  it('should initialize with actual value', () => {
    const mockOnToggle = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    expect(result.current.value).toBe(false);
  });

  it('should sync optimistic value with actual value changes', () => {
    const mockOnToggle = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { result, rerender } = renderHook<
      { value: boolean; toggle: () => Promise<void> },
      { actualValue: boolean; onToggle: () => Promise<void> }
    >(({ actualValue, onToggle }) => useOptimisticToggle(actualValue, onToggle), {
      initialProps: { actualValue: false, onToggle: mockOnToggle },
    });

    expect(result.current.value).toBe(false);

    rerender({ actualValue: true, onToggle: mockOnToggle });

    expect(result.current.value).toBe(true);
  });

  it('should optimistically toggle from false to true', async () => {
    const mockOnToggle = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    expect(result.current.value).toBe(false);

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.value).toBe(true);
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should optimistically toggle from true to false', async () => {
    const mockOnToggle = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOptimisticToggle(true, mockOnToggle));

    expect(result.current.value).toBe(true);

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.value).toBe(false);
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should revert optimistic value on error', async () => {
    const mockOnToggle = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('Toggle failed'));
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    expect(result.current.value).toBe(false);

    await act(async () => {
      await result.current.toggle();
    });

    // Should revert to original value
    expect(result.current.value).toBe(false);
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple successful toggles', async () => {
    const mockOnToggle = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { result, rerender } = renderHook<
      { value: boolean; toggle: () => Promise<void> },
      { actualValue: boolean; onToggle: () => Promise<void> }
    >(({ actualValue, onToggle }) => useOptimisticToggle(actualValue, onToggle), {
      initialProps: { actualValue: false, onToggle: mockOnToggle },
    });

    // First toggle: false -> true
    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.value).toBe(true);

    // Simulate external update confirming the change
    rerender({ actualValue: true, onToggle: mockOnToggle });

    // Second toggle: true -> false
    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.value).toBe(false);
  });

  it('should handle error then success sequence', async () => {
    const mockOnToggle = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('First failed'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    // First toggle fails
    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.value).toBe(false); // Reverted

    // Second toggle succeeds
    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.value).toBe(true); // Changed
  });

  it('should not call onToggle if callback changes', async () => {
    const mockOnToggle1 = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const mockOnToggle2 = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

    const { result, rerender } = renderHook<
      { value: boolean; toggle: () => Promise<void> },
      { actualValue: boolean; onToggle: () => Promise<void> }
    >(({ actualValue, onToggle }) => useOptimisticToggle(actualValue, onToggle), {
      initialProps: { actualValue: false, onToggle: mockOnToggle1 },
    });

    // Toggle with first callback
    await act(async () => {
      await result.current.toggle();
    });

    expect(mockOnToggle1).toHaveBeenCalledTimes(1);
    expect(mockOnToggle2).not.toHaveBeenCalled();

    // Change callback
    rerender({ actualValue: true, onToggle: mockOnToggle2 });

    // Toggle with second callback
    await act(async () => {
      await result.current.toggle();
    });

    expect(mockOnToggle1).toHaveBeenCalledTimes(1); // Still 1
    expect(mockOnToggle2).toHaveBeenCalledTimes(1); // Called once
  });

  it('should maintain optimistic state during async operation', async () => {
    let resolveToggle: () => void;
    const togglePromise = new Promise<void>(resolve => {
      resolveToggle = resolve;
    });

    const mockOnToggle = jest.fn<() => Promise<void>>().mockReturnValue(togglePromise);
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    // Start toggle (doesn't await)
    act(() => {
      result.current.toggle();
    });

    // Should immediately show optimistic state
    expect(result.current.value).toBe(true);

    // Resolve the async operation
    await act(async () => {
      resolveToggle!();
      await togglePromise;
    });

    // Should maintain optimistic state after success
    expect(result.current.value).toBe(true);
  });

  it('should revert optimistic state when async operation fails', async () => {
    let rejectToggle: (error: Error) => void;
    const togglePromise = new Promise<void>((_, reject) => {
      rejectToggle = reject;
    });

    const mockOnToggle = jest.fn<() => Promise<void>>().mockReturnValue(togglePromise);
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    // Start toggle
    act(() => {
      result.current.toggle();
    });

    // Should immediately show optimistic state
    expect(result.current.value).toBe(true);

    // Reject the async operation
    await act(async () => {
      rejectToggle!(new Error('Failed'));
      await togglePromise.catch(() => {});
    });

    // Should revert to original state
    expect(result.current.value).toBe(false);
  });

  it('should handle rapid toggles correctly', async () => {
    const mockOnToggle = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    await act(async () => {
      await result.current.toggle(); // false -> true
    });

    expect(result.current.value).toBe(true);

    await act(async () => {
      await result.current.toggle(); // true -> false
    });

    expect(result.current.value).toBe(false);

    await act(async () => {
      await result.current.toggle(); // false -> true
    });

    expect(result.current.value).toBe(true);

    expect(mockOnToggle).toHaveBeenCalledTimes(3);
  });

  it('should silently catch errors (no re-throw)', async () => {
    const mockOnToggle = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('Toggle failed'));
    const { result } = renderHook(() => useOptimisticToggle(false, mockOnToggle));

    // Should not throw error
    await expect(
      act(async () => {
        await result.current.toggle();
      }),
    ).resolves.toBeUndefined();

    expect(result.current.value).toBe(false); // Reverted
  });
});
