import { renderHook } from '@testing-library/react-native';
import { useColors } from '../../hooks/useColors';

// Define mock values inline instead of importing from external modules
const MOCK_LIGHT_THEME = 'light';
const MOCK_COLORS = {
  [MOCK_LIGHT_THEME]: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#007AFF',
    // Add other colors as needed
  },
};

// Mock the Redux store and Colors
jest.mock('@/store/hooks', () => ({
  useAppSelectorMemo: jest.fn(selector => {
    // Mock implementation that returns the theme from the state
    const mockState = { theme: { theme: MOCK_LIGHT_THEME } };
    return selector(mockState);
  }),
}));

jest.mock('@/constants/Colors', () => ({
  Colors: MOCK_COLORS,
  Theme: {
    Light: 'light',
    Dark: 'dark',
  },
}));

describe('useColors', () => {
  it('returns the light theme colors by default', () => {
    const { result } = renderHook(() => useColors());
    expect(result.current).toEqual(MOCK_COLORS[MOCK_LIGHT_THEME]);
  });

  it('memoizes the colors object', () => {
    const { result, rerender } = renderHook(() => useColors());

    // Get the initial result
    const firstResult = result.current;

    // Rerender the hook
    rerender({});

    // The result should be the same object (memoized)
    expect(result.current).toBe(firstResult);
  });
});
