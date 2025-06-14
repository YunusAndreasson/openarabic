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

  it('scales down font size for long words but not below min', () => {
    jest.spyOn(layout, 'useScreenWidth').mockReturnValue(300);
    const longWord = 'abcdefghijklmnopqrstuvwxyz';
    const { result } = renderHook(() =>
      useWordSizing(longWord, { maxFontSize: 100, minFontSize: 40 })
    );
    expect(result.current).toBeLessThan(100);
    expect(result.current).toBeGreaterThanOrEqual(40);
  });
});
