import { renderHook } from '@testing-library/react-native';
import { useWordSizing } from '../../../hooks/vocabulary/useWordSizing';

// Mock the SCREEN_WIDTH constant
jest.mock('../../../constants/layout', () => {
  const actual = jest.requireActual('../../../constants/layout');
  return {
    ...actual,
    SCREEN_WIDTH: 375, // Default test screen width
  };
});

describe('useWordSizing', () => {
  it('returns max font size for short words', () => {
    const { result } = renderHook(() =>
      useWordSizing('سلام', { maxFontSize: 100, minFontSize: 50 }),
    );
    expect(result.current).toBe(100);
  });

  it('returns min font size for extremely long words', () => {
    // Temporarily override SCREEN_WIDTH for this test
    const mockLayoutModule = require('../../../constants/layout');
    const originalWidth = mockLayoutModule.SCREEN_WIDTH;
    mockLayoutModule.SCREEN_WIDTH = 300;

    const longWord = 'a'.repeat(51); // word length > 50 characters
    const { result } = renderHook(() =>
      useWordSizing(longWord, { maxFontSize: 100, minFontSize: 40 }),
    );
    expect(result.current).toBe(40);

    // Restore original width
    mockLayoutModule.SCREEN_WIDTH = originalWidth;
  });

  it('returns max font size when word is undefined', () => {
    const { result } = renderHook(() =>
      useWordSizing(undefined, { maxFontSize: 120, minFontSize: 60 }),
    );
    expect(result.current).toBe(120);
  });

  it('returns max font size for words equal to long word threshold', () => {
    const thresholdWord = 'abcdefghijklmno'; // 15 characters
    const { result } = renderHook(() =>
      useWordSizing(thresholdWord, { maxFontSize: 100, minFontSize: 50 }),
    );
    expect(result.current).toBe(100);
  });

  it('calculates scaled size between min and max for long words', () => {
    // Temporarily override SCREEN_WIDTH for this test
    const mockLayoutModule = require('../../../constants/layout');
    const originalWidth = mockLayoutModule.SCREEN_WIDTH;
    mockLayoutModule.SCREEN_WIDTH = 1000;

    const longWord = 'abcdefghijklmnopqrst'; // 20 characters
    const { result } = renderHook(() =>
      useWordSizing(longWord, { maxFontSize: 100, minFontSize: 50 }),
    );
    expect(result.current).toBe(75);

    // Restore original width
    mockLayoutModule.SCREEN_WIDTH = originalWidth;
  });
});
