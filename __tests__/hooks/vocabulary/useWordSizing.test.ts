import { renderHook } from '@testing-library/react-native';
import { useWordSizing } from '../../../hooks/vocabulary/useWordSizing';
import * as layout from '../../../constants/layout';

describe('useWordSizing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns max font size for short words', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(375);
    const { result } = renderHook(() => useWordSizing('سلام', { maxFontSize: 100, minFontSize: 50 }));
    expect(result.current).toBe(100);
  });

  it('returns min font size for extremely long words', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(300);
    const longWord = 'a'.repeat(51); // word length > 50 characters
    const { result } = renderHook(() =>
      useWordSizing(longWord, { maxFontSize: 100, minFontSize: 40 })
    );
    expect(result.current).toBe(40);
  });

  it('returns max font size when word is undefined', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(320);
    const { result } = renderHook(() => useWordSizing(undefined, { maxFontSize: 120, minFontSize: 60 }));
    expect(result.current).toBe(120);
  });

  it('returns max font size for words equal to long word threshold', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(400);
    const thresholdWord = 'abcdefghijklmno'; // 15 characters
    const { result } = renderHook(() =>
      useWordSizing(thresholdWord, { maxFontSize: 100, minFontSize: 50 })
    );
    expect(result.current).toBe(100);
  });

  it('calculates scaled size between min and max for long words', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(1000);
    const longWord = 'abcdefghijklmnopqrst'; // 20 characters
    const { result } = renderHook(() =>
      useWordSizing(longWord, { maxFontSize: 100, minFontSize: 50 })
    );
    expect(result.current).toBe(75);
  });

  it('uses default options when none provided', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(375);
    const { result } = renderHook(() => useWordSizing('short')); // defaults 50/100
    expect(result.current).toBe(100);
  });
});
