import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { useModalState } from '@/hooks/ui/useModalState';

interface TestData {
  id: number;
  name: string;
}

describe('useModalState', () => {
  it('should initialize with modal closed and no data', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should open modal without data', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    act(() => {
      result.current.open();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('should open modal with data payload', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const testData: TestData = { id: 1, name: 'Test' };

    act(() => {
      result.current.open(testData);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(testData);
  });

  it('should close modal and clear data', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const testData: TestData = { id: 1, name: 'Test' };

    act(() => {
      result.current.open(testData);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(testData);

    act(() => {
      result.current.close();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should toggle modal from closed to open', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    expect(result.current.isVisible).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('should toggle modal from open to closed', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    act(() => {
      result.current.open();
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should toggle with data payload when opening', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const testData: TestData = { id: 2, name: 'Toggle Test' };

    act(() => {
      result.current.toggle(testData);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(testData);
  });

  it('should update data when opening modal multiple times', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const data1: TestData = { id: 1, name: 'First' };
    const data2: TestData = { id: 2, name: 'Second' };

    act(() => {
      result.current.open(data1);
    });

    expect(result.current.data).toEqual(data1);

    act(() => {
      result.current.close();
    });

    act(() => {
      result.current.open(data2);
    });

    expect(result.current.data).toEqual(data2);
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useModalState<TestData>());

    const { open, close, toggle } = result.current;

    rerender();

    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
    expect(result.current.toggle).toBe(toggle);
  });

  it('should work with different data types', () => {
    const { result: stringResult } = renderHook(() => useModalState<string>());

    act(() => {
      stringResult.current.open('test string');
    });

    expect(stringResult.current.data).toBe('test string');

    const { result: numberResult } = renderHook(() => useModalState<number>());

    act(() => {
      numberResult.current.open(42);
    });

    expect(numberResult.current.data).toBe(42);
  });

  it('should handle undefined payload gracefully', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    act(() => {
      result.current.open(undefined);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('should allow opening modal without closing first', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const data1: TestData = { id: 1, name: 'First' };
    const data2: TestData = { id: 2, name: 'Second' };

    act(() => {
      result.current.open(data1);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(data1);

    // Open again without closing - should update data
    act(() => {
      result.current.open(data2);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(data2);
  });

  it('should handle complex object data', () => {
    interface ComplexData {
      user: { id: number; name: string };
      metadata: { timestamp: string; tags: string[] };
    }

    const { result } = renderHook(() => useModalState<ComplexData>());

    const complexData: ComplexData = {
      user: { id: 1, name: 'John' },
      metadata: {
        timestamp: '2024-01-01',
        tags: ['tag1', 'tag2'],
      },
    };

    act(() => {
      result.current.open(complexData);
    });

    expect(result.current.data).toEqual(complexData);
  });
});
