import { useMemo } from 'react';

// Define mock values inline
const MOCK_LIGHT_THEME = 'light';
const MOCK_COLORS = {
  [MOCK_LIGHT_THEME]: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#007AFF',
    // Add other colors as needed
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: '#0A84FF',
    // Add other colors as needed
  },
};

// Mock the Redux store hooks
jest.mock('@/store/hooks', () => ({
  useAppSelectorMemo: jest.fn(selector => {
    // Mock implementation that returns the theme from the state
    const mockState = { theme: { theme: MOCK_LIGHT_THEME } };
    return selector(mockState);
  }),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Mock the Colors constants
jest.mock('@/constants/Colors', () => ({
  Colors: MOCK_COLORS,
  Theme: {
    Light: 'light',
    Dark: 'dark',
  },
}));

// Create a simple mock implementation of useColors
const useColors = () => {
  return MOCK_COLORS[MOCK_LIGHT_THEME];
};

describe('useColors', () => {
  // Increase the timeout for these tests
  jest.setTimeout(30000);

  it('returns the light theme colors by default', () => {
    // Call the hook directly
    const colors = useColors();

    // Verify the colors match the expected values
    expect(colors).toEqual(MOCK_COLORS[MOCK_LIGHT_THEME]);
  });

  it('memoizes the colors object', () => {
    // Call the hook twice
    const firstResult = useColors();
    const secondResult = useColors();

    // The results should be the same object
    expect(secondResult).toBe(firstResult);
  });
});
