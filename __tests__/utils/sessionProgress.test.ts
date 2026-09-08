import { getSessionProgress } from '@/utils/review/sessionProgress';

describe('getSessionProgress', () => {
  test('measures all words, including those beyond the first working set', () => {
    expect(getSessionProgress(10, 30)).toBe(33);
    expect(getSessionProgress(20, 30)).toBe(67);
    expect(getSessionProgress(29, 30)).toBe(97);
    expect(getSessionProgress(30, 30)).toBe(100);
  });

  test('does not round an unfinished session up to 100%', () => {
    expect(getSessionProgress(1492, 1493)).toBe(99);
    expect(getSessionProgress(1493, 1493)).toBe(100);
  });

  test('handles small and empty sessions', () => {
    expect(getSessionProgress(0, 4)).toBe(0);
    expect(getSessionProgress(2, 4)).toBe(50);
    expect(getSessionProgress(4, 4)).toBe(100);
    expect(getSessionProgress(0, 0)).toBe(0);
  });

  test('stays monotonic and below full until the final word finishes', () => {
    let previous = 0;
    for (let finished = 0; finished < 1493; finished += 1) {
      const progress = getSessionProgress(finished, 1493);
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress).toBeLessThan(100);
      previous = progress;
    }
  });
});
