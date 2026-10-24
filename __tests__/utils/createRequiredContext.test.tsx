import { renderHook } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import React, { type ReactNode } from 'react';

import { createRequiredContext } from '@/utils/createRequiredContext';

describe('createRequiredContext', () => {
  const [ThingContext, useThing] = createRequiredContext<{ name: string }>(
    'ThingContext',
    'useThing must be used within a ThingProvider',
  );

  test('throws the caller’s message when no provider is mounted', () => {
    expect(() => renderHook(() => useThing())).toThrow(
      'useThing must be used within a ThingProvider',
    );
  });

  test('returns the provided value inside a provider', () => {
    const value = { name: 'thing' };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThingContext value={value}>{children}</ThingContext>
    );
    const { result } = renderHook(() => useThing(), { wrapper });
    expect(result.current).toBe(value);
  });

  test('names the context for the devtools', () => {
    expect(ThingContext.displayName).toBe('ThingContext');
  });
});
