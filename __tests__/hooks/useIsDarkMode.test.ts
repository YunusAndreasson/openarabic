/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';

import { Theme } from '@/constants/colors';
import { useIsDarkMode, useNativeColorScheme } from '@/hooks/theme/useThemeDetection';

// The stored theme, read through the real selector.
let mockStoredTheme: Theme | null = Theme.Dark;
jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (state: { theme: { theme: Theme | null } }) => unknown) =>
    selector({ theme: { theme: mockStoredTheme } }),
}));

const mockedUseColorScheme = useColorScheme as jest.Mock;

describe('useIsDarkMode', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns true when theme is dark', () => {
    mockStoredTheme = Theme.Dark;

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeTruthy();
  });

  test('returns false when theme is light', () => {
    mockStoredTheme = Theme.Light;

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeFalsy();
  });

  test('a stored null theme is the shipped default, Dark, whatever the OS says', () => {
    // The OS-appearance fallback is gone: every reader of an unset theme now
    // agrees on Dark, and no theme reader subscribes to the system scheme.
    mockStoredTheme = null;
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(true);
    expect(mockedUseColorScheme).not.toHaveBeenCalled();
  });

  test('returns false for sepia theme', () => {
    mockStoredTheme = Theme.Sepia;

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBeFalsy();
  });
});

describe('useNativeColorScheme', () => {
  test('follows the app theme, with sepia as light', () => {
    mockStoredTheme = Theme.Sepia;
    expect(renderHook(() => useNativeColorScheme()).result.current).toBe('light');

    mockStoredTheme = Theme.Dark;
    expect(renderHook(() => useNativeColorScheme()).result.current).toBe('dark');
  });
});
