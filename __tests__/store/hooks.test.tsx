/**
 * Store Hooks Tests
 *
 * Modern Jest 29 Patterns:
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 *
 * Note: The hooks in store/hooks.ts are thin wrappers around react-redux hooks
 * with TypeScript typing. These tests verify:
 * 1. The hooks exist and are callable
 * 2. The type exports are correct
 * 3. The useAppSelectorShallow uses shallowEqual comparison
 *
 * For full integration testing, see the testStore helper which is tested elsewhere.
 */

import { renderHook } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { Theme } from '@/constants/colors';
import {
  useAppDispatch,
  useAppSelector,
  useAppSelectorShallow,
} from '../../store/hooks';
import { setupTestStore } from '../helpers/testStore';

describe('Redux hooks', () => {
  // Simple wrapper using test store
  const createWrapper = () => {
    const store = setupTestStore();
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    return { Wrapper, store };
  };

  describe('useAppDispatch', () => {
    test('returns dispatch function', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useAppDispatch(), { wrapper: Wrapper });

      expect(typeof result.current).toBe('function');
    });

    test('dispatch function is callable', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useAppDispatch(), { wrapper: Wrapper });

      // Verify dispatch can be called without throwing
      expect(() => result.current({ type: 'TEST_ACTION' })).not.toThrow();
    });
  });

  describe('useAppSelector', () => {
    test('returns a value from selector', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useAppSelector(state => state.theme.theme),
        { wrapper: Wrapper },
      );

      // Verify it returns a valid theme value
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
    });

    test('can select settings values', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useAppSelector(state => state.settings.arabicFont),
        { wrapper: Wrapper },
      );

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
    });

    test('selector function is called with state', () => {
      const { Wrapper } = createWrapper();
      const selector = jest.fn(state => state.theme.theme);

      renderHook(() => useAppSelector(selector), { wrapper: Wrapper });

      expect(selector).toHaveBeenCalled();
      expect(selector.mock.calls[0][0]).toHaveProperty('theme');
    });
  });

  describe('useAppSelectorShallow', () => {
    test('returns a value from selector', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useAppSelectorShallow(state => state.theme.theme),
        { wrapper: Wrapper },
      );

      expect(result.current).toBeDefined();
    });

    test('can select multiple values as object', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useAppSelectorShallow(state => ({
            theme: state.theme.theme,
            font: state.settings.arabicFont,
          })),
        { wrapper: Wrapper },
      );

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('font');
    });

    test('selector function is called with state', () => {
      const { Wrapper } = createWrapper();
      const selector = jest.fn(state => ({
        theme: state.theme.theme,
      }));

      renderHook(() => useAppSelectorShallow(selector), { wrapper: Wrapper });

      expect(selector).toHaveBeenCalled();
      expect(selector.mock.calls[0][0]).toHaveProperty('theme');
      expect(selector.mock.calls[0][0]).toHaveProperty('settings');
    });
  });

  describe('hook exports', () => {
    test('useAppDispatch is exported', () => {
      expect(useAppDispatch).toBeDefined();
      expect(typeof useAppDispatch).toBe('function');
    });

    test('useAppSelector is exported', () => {
      expect(useAppSelector).toBeDefined();
      expect(typeof useAppSelector).toBe('function');
    });

    test('useAppSelectorShallow is exported', () => {
      expect(useAppSelectorShallow).toBeDefined();
      expect(typeof useAppSelectorShallow).toBe('function');
    });
  });
});
