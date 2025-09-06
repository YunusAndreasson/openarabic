import { renderHook } from '@testing-library/react-native';

import { Theme } from '@/constants/colors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useColorScheme } from 'react-native';

// Mock the selector hook so we can control the returned theme
jest.mock('@/store/hooks', () => ({
  useAppSelectorMemo: jest.fn(),
}));

const mockedSelector = require('@/store/hooks').useAppSelectorMemo as jest.Mock;
const mockedUseColorScheme = useColorScheme as jest.Mock;

describe('useIsDarkMode', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when theme is dark', () => {
    mockedSelector.mockReturnValue(Theme.Dark);

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(true);
  });

  it('returns false when theme is light', () => {
    mockedSelector.mockReturnValue(Theme.Light);

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(false);
  });

  it('falls back to system preference when theme is null', () => {
    mockedSelector.mockReturnValue(null);
    mockedUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(true);
    expect(mockedUseColorScheme).toHaveBeenCalled();
  });

  it('returns false for light system preference fallback', () => {
    mockedSelector.mockReturnValue(null);
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(false);
  });

  it('returns false for sepia theme', () => {
    mockedSelector.mockReturnValue(Theme.Sepia);

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(false);
  });

  it('handles undefined selector return', () => {
    mockedSelector.mockReturnValue(undefined);
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => useIsDarkMode());

    expect(result.current).toBe(false);
  });
});
