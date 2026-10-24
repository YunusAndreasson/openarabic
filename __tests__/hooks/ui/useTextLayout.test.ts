import { renderHook } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { INLINE_VALUE_MIN_WIDTH } from '@/constants/layout';
import { useTextLayout } from '@/hooks/ui/useTextLayout';

describe('useTextLayout', () => {
  test('a phone at the default text size is not crowded', () => {
    const { result } = renderHook(() => useTextLayout());
    expect(result.current.crowded).toBe(false);
    expect(result.current.fontScale).toBe(1);
  });

  test('large accessibility text makes the same window crowded', () => {
    // Spy on the module object the hook reads (`require`), not an
    // `import * as` namespace — Babel's interop gives that a separate copy.
    const ReactNative: typeof import('react-native') = require('react-native');
    const spy = jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width: INLINE_VALUE_MIN_WIDTH * 1.5,
      height: 800,
      scale: 2,
      fontScale: 2,
    });
    const { result } = renderHook(() => useTextLayout());
    expect(result.current.crowded).toBe(true);
    expect(result.current.fontScale).toBe(2);
    spy.mockRestore();
  });
});
