/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { renderHook } from '@testing-library/react-native';

import { Theme } from '@/constants/colors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useColorScheme } from 'react-native';

// Mock the selector hook so we can control the returned theme
jest.mock('@/store/hooks', () => ({
  useAppSelectorShallow: jest.fn(),
}));

const mockedSelector = require('@/store/hooks').useAppSelectorShallow as jest.Mock;
const mockedUseColorScheme = useColorScheme as jest.Mock;

describe('useIsDarkMode', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns true when theme is dark', () => {
    mockedSelector.mockReturnValue(Theme.Dark);

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeTruthy();
  });

  test('returns false when theme is light', () => {
    mockedSelector.mockReturnValue(Theme.Light);

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeFalsy();
  });

  test('falls back to system preference when theme is null', () => {
    mockedSelector.mockReturnValue(null);
    mockedUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeTruthy();
    expect(mockedUseColorScheme).toHaveBeenCalled();
  });

  test('returns false for light system preference fallback', () => {
    mockedSelector.mockReturnValue(null);
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeFalsy();
  });

  test('returns false for sepia theme', () => {
    mockedSelector.mockReturnValue(Theme.Sepia);

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeFalsy();
  });

  test('handles undefined selector return', () => {
    mockedSelector.mockReturnValue(undefined);
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeFalsy();
  });
});
