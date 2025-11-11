/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { useModalState } from '@/hooks/ui/useModalState';

interface TestData {
  id: number;
  name: string;
}

describe('useModalState', () => {
  test('should initialize with modal closed and no data', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.data).toBeNull();
  });

  test('should open modal without data', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    act(() => {
      result.current.open();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toBeNull();
  });

  test('should open modal with data payload', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const testData: TestData = { id: 1, name: 'Test' };

    act(() => {
      result.current.open(testData);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(testData);
  });

  test('should close modal and clear data', () => {
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

  test.each([
    {
      description: 'closed to open',
      setup: () => {},
      expectedBefore: false,
      expectedAfter: true,
    },
    {
      description: 'open to closed',
      setup: (result: any) => {
        act(() => {
          result.current.open();
        });
      },
      expectedBefore: true,
      expectedAfter: false,
    },
  ])('should toggle modal from $description', ({ setup, expectedBefore, expectedAfter }) => {
    const { result } = renderHook(() => useModalState<TestData>());

    setup(result);

    expect(result.current.isVisible).toBe(expectedBefore);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isVisible).toBe(expectedAfter);
    if (!expectedAfter) {
      expect(result.current.data).toBeNull();
    }
  });

  test('should toggle with data payload when opening', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const testData: TestData = { id: 2, name: 'Toggle Test' };

    act(() => {
      result.current.toggle(testData);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toEqual(testData);
  });

  test('should update data when opening modal multiple times', () => {
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

  test('should maintain stable function references', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    const { open, close, toggle } = result.current;

    // Open and close to trigger state changes
    act(() => {
      open();
    });
    act(() => {
      close();
    });

    // Function references should remain stable
    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
    expect(result.current.toggle).toBe(toggle);
  });

  test.each([
    {
      type: 'string',
      value: 'test string',
    },
    {
      type: 'number',
      value: 42,
    },
    {
      type: 'object',
      value: { id: 1, name: 'Test' },
    },
  ])('should work with $type data type', ({ value }) => {
    const { result } = renderHook(() => useModalState<typeof value>());

    act(() => {
      result.current.open(value);
    });

    expect(result.current.data).toEqual(value);
  });

  test('should handle undefined payload gracefully', () => {
    const { result } = renderHook(() => useModalState<TestData>());

    act(() => {
      result.current.open(undefined);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.data).toBeNull();
  });

  test('should allow opening modal without closing first', () => {
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

  test('should handle complex object data', () => {
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
