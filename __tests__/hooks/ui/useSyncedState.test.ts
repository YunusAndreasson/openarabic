import type { Dispatch, SetStateAction } from 'react';

import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { useSyncedState } from '@/hooks/ui/useSyncedState';

describe('useSyncedState', () => {
  it('should initialize with external value', () => {
    const { result } = renderHook(() => useSyncedState('initial'));

    const [value] = result.current;

    expect(value).toBe('initial');
  });

  it('should allow updating internal value', () => {
    const { result } = renderHook(() => useSyncedState('initial'));

    act(() => {
      const [, setValue] = result.current;
      setValue('updated');
    });

    const [value] = result.current;
    expect(value).toBe('updated');
  });

  it('should sync internal value when external value changes', () => {
    const { result, rerender } = renderHook<
      [string, Dispatch<SetStateAction<string>>],
      { externalValue: string }
    >(({ externalValue }) => useSyncedState(externalValue), {
      initialProps: { externalValue: 'initial' },
    });

    const [value1] = result.current;
    expect(value1).toBe('initial');

    // Change external value via props
    rerender({ externalValue: 'external-updated' });

    const [value2] = result.current;
    expect(value2).toBe('external-updated');
  });

  it('should override internal value when external value changes', () => {
    const { result, rerender } = renderHook<
      [string, Dispatch<SetStateAction<string>>],
      { externalValue: string }
    >(({ externalValue }) => useSyncedState(externalValue), {
      initialProps: { externalValue: 'initial' },
    });

    // Set internal value
    act(() => {
      const [, setValue] = result.current;
      setValue('internal-updated');
    });

    const [value1] = result.current;
    expect(value1).toBe('internal-updated');

    // External value changes - should override internal
    rerender({ externalValue: 'external-updated' });

    const [value2] = result.current;
    expect(value2).toBe('external-updated');
  });

  it('should allow multiple internal updates', () => {
    const { result } = renderHook(() => useSyncedState('initial'));

    act(() => {
      const [, setValue] = result.current;
      setValue('first');
    });

    expect(result.current[0]).toBe('first');

    act(() => {
      const [, setValue] = result.current;
      setValue('second');
    });

    expect(result.current[0]).toBe('second');

    act(() => {
      const [, setValue] = result.current;
      setValue('third');
    });

    expect(result.current[0]).toBe('third');
  });

  it('should work with different value types', () => {
    // Number type
    const { result: numberResult } = renderHook(() => useSyncedState(0));

    act(() => {
      const [, setValue] = numberResult.current;
      setValue(42);
    });

    expect(numberResult.current[0]).toBe(42);

    // Boolean type
    const { result: boolResult } = renderHook(() => useSyncedState(false));

    act(() => {
      const [, setValue] = boolResult.current;
      setValue(true);
    });

    expect(boolResult.current[0]).toBe(true);

    // Object type (use stable reference to avoid infinite loop)
    const initialObject = { id: 1 };
    const { result: objectResult } = renderHook(() => useSyncedState(initialObject));

    act(() => {
      const [, setValue] = objectResult.current;
      setValue({ id: 2 });
    });

    expect(objectResult.current[0]).toEqual({ id: 2 });
  });

  it('should sync immediately when external value changes multiple times', () => {
    const { result, rerender } = renderHook<
      [string, Dispatch<SetStateAction<string>>],
      { externalValue: string }
    >(({ externalValue }) => useSyncedState(externalValue), {
      initialProps: { externalValue: 'v1' },
    });

    expect(result.current[0]).toBe('v1');

    rerender({ externalValue: 'v2' });
    expect(result.current[0]).toBe('v2');

    rerender({ externalValue: 'v3' });
    expect(result.current[0]).toBe('v3');
  });

  it('should handle null and undefined values', () => {
    const { result } = renderHook(() => useSyncedState<string | null>(null));

    expect(result.current[0]).toBeNull();

    act(() => {
      const [, setValue] = result.current;
      setValue('value');
    });

    expect(result.current[0]).toBe('value');

    act(() => {
      const [, setValue] = result.current;
      setValue(null);
    });

    expect(result.current[0]).toBeNull();
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() => useSyncedState(10));

    act(() => {
      const [, setValue] = result.current;
      setValue(prev => prev + 5);
    });

    expect(result.current[0]).toBe(15);

    act(() => {
      const [, setValue] = result.current;
      setValue(prev => prev * 2);
    });

    expect(result.current[0]).toBe(30);
  });

  it('should not cause infinite loops when external value is an object', () => {
    // Use stable reference to prevent infinite loops
    const obj1 = { count: 1 };
    const { result, rerender } = renderHook<
      [{ count: number }, Dispatch<SetStateAction<{ count: number }>>],
      { externalValue: { count: number } }
    >(({ externalValue }) => useSyncedState(externalValue), {
      initialProps: { externalValue: obj1 },
    });

    expect(result.current[0]).toBe(obj1);

    // Change to new object reference
    const obj2 = { count: 2 };
    rerender({ externalValue: obj2 });

    expect(result.current[0]).toBe(obj2);
    expect(result.current[0]).not.toBe(obj1);
  });

  it('should handle rapid external value changes', () => {
    const { result, rerender } = renderHook<
      [number, Dispatch<SetStateAction<number>>],
      { externalValue: number }
    >(({ externalValue }) => useSyncedState(externalValue), {
      initialProps: { externalValue: 0 },
    });

    // Rapid changes
    for (let i = 1; i <= 10; i++) {
      rerender({ externalValue: i });
      expect(result.current[0]).toBe(i);
    }
  });

  it('should maintain internal value when external value stays the same', () => {
    const { result, rerender } = renderHook<
      [string, Dispatch<SetStateAction<string>>],
      { externalValue: string }
    >(({ externalValue }) => useSyncedState(externalValue), {
      initialProps: { externalValue: 'constant' },
    });

    act(() => {
      const [, setValue] = result.current;
      setValue('changed');
    });

    expect(result.current[0]).toBe('changed');

    // Rerender with same external value (dependency hasn't changed)
    rerender({ externalValue: 'constant' });

    // Should maintain internal value since external value didn't actually change
    expect(result.current[0]).toBe('changed');
  });
});
