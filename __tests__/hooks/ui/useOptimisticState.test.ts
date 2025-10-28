import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { useOptimisticState } from '@/hooks/ui/useOptimisticState';

describe('useOptimisticState', () => {
  it('should initialize with actual value', () => {
    const { result } = renderHook(() => useOptimisticState('initial', false));

    const [displayValue] = result.current;

    expect(displayValue).toBe('initial');
  });

  it('should return actual value when optimistic updates disabled', () => {
    const { result } = renderHook(() => useOptimisticState('actual', false));

    const [displayValue, setOptimistic] = result.current;

    expect(displayValue).toBe('actual');

    act(() => {
      setOptimistic('optimistic');
    });

    // Should still show actual value because optimistic is disabled
    const [newDisplayValue] = result.current;
    expect(newDisplayValue).toBe('actual');
  });

  it('should return optimistic value when optimistic updates enabled', () => {
    const { result } = renderHook(() => useOptimisticState('actual', true));

    const [displayValue, setOptimistic] = result.current;

    expect(displayValue).toBe('actual');

    act(() => {
      setOptimistic('optimistic');
    });

    const [newDisplayValue] = result.current;
    expect(newDisplayValue).toBe('optimistic');
  });

  it('should sync optimistic value with actual value changes', () => {
    const { result, rerender } = renderHook(
      ({ actualValue, supportsOptimistic }) => useOptimisticState(actualValue, supportsOptimistic),
      {
        initialProps: { actualValue: 'initial', supportsOptimistic: true },
      },
    );

    const [displayValue1] = result.current;
    expect(displayValue1).toBe('initial');

    // Change actual value via props
    rerender({ actualValue: 'updated', supportsOptimistic: true });

    const [displayValue2] = result.current;
    expect(displayValue2).toBe('updated');
  });

  it('should override optimistic value when actual value changes', () => {
    const { result, rerender } = renderHook(
      ({ actualValue, supportsOptimistic }) => useOptimisticState(actualValue, supportsOptimistic),
      {
        initialProps: { actualValue: 'initial', supportsOptimistic: true },
      },
    );

    // Set optimistic value
    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('optimistic');
    });

    const [displayValue1] = result.current;
    expect(displayValue1).toBe('optimistic');

    // Actual value changes - should override optimistic
    rerender({ actualValue: 'actual-updated', supportsOptimistic: true });

    const [displayValue2] = result.current;
    expect(displayValue2).toBe('actual-updated');
  });

  it('should allow setting optimistic value multiple times', () => {
    const { result } = renderHook(() => useOptimisticState('initial', true));

    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('first');
    });

    const [displayValue1] = result.current;
    expect(displayValue1).toBe('first');

    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('second');
    });

    const [displayValue2] = result.current;
    expect(displayValue2).toBe('second');

    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('third');
    });

    const [displayValue3] = result.current;
    expect(displayValue3).toBe('third');
  });

  it('should work with different value types', () => {
    const { result: numberResult } = renderHook(() => useOptimisticState(0, true));

    act(() => {
      const [, setOptimistic] = numberResult.current;
      setOptimistic(42);
    });

    const [numberValue] = numberResult.current;
    expect(numberValue).toBe(42);

    const { result: boolResult } = renderHook(() => useOptimisticState(false, true));

    act(() => {
      const [, setOptimistic] = boolResult.current;
      setOptimistic(true);
    });

    const [boolValue] = boolResult.current;
    expect(boolValue).toBe(true);

    // Use stable object reference to avoid infinite loop
    const initialObject = { id: 1 };
    const { result: objectResult } = renderHook(() => useOptimisticState(initialObject, true));

    act(() => {
      const [, setOptimistic] = objectResult.current;
      setOptimistic({ id: 2 });
    });

    const [objectValue] = objectResult.current;
    expect(objectValue).toEqual({ id: 2 });
  });

  it('should toggle between optimistic and non-optimistic modes', () => {
    const { result, rerender } = renderHook(
      ({ actualValue, supportsOptimistic }) => useOptimisticState(actualValue, supportsOptimistic),
      {
        initialProps: { actualValue: 'actual', supportsOptimistic: false },
      },
    );

    // Set optimistic value while disabled
    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('optimistic');
    });

    const [displayValue1] = result.current;
    expect(displayValue1).toBe('actual'); // Should show actual

    // Enable optimistic mode
    rerender({ actualValue: 'actual', supportsOptimistic: true });

    const [displayValue2] = result.current;
    expect(displayValue2).toBe('optimistic'); // Should now show optimistic
  });

  it('should default to non-optimistic mode when second param not provided', () => {
    const { result } = renderHook(() => useOptimisticState('actual'));

    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('optimistic');
    });

    const [displayValue] = result.current;
    expect(displayValue).toBe('actual'); // Should show actual, not optimistic
  });

  it('should handle null and undefined values', () => {
    const { result } = renderHook(() => useOptimisticState<string | null>(null, true));

    const [displayValue1] = result.current;
    expect(displayValue1).toBeNull();

    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic('value');
    });

    const [displayValue2] = result.current;
    expect(displayValue2).toBe('value');

    act(() => {
      const [, setOptimistic] = result.current;
      setOptimistic(null);
    });

    const [displayValue3] = result.current;
    expect(displayValue3).toBeNull();
  });

  it('should sync immediately when actual value changes', () => {
    const { result, rerender } = renderHook(
      ({ actualValue }) => useOptimisticState(actualValue, true),
      {
        initialProps: { actualValue: 'v1' },
      },
    );

    expect(result.current[0]).toBe('v1');

    rerender({ actualValue: 'v2' });
    expect(result.current[0]).toBe('v2');

    rerender({ actualValue: 'v3' });
    expect(result.current[0]).toBe('v3');
  });
});
