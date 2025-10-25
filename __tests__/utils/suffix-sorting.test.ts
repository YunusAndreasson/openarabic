import { ARABIC_SUFFIXES } from '@/constants/arabicWordComponents';

describe('ARABIC_SUFFIXES sorting', () => {
  it('should be sorted by length (longest first)', () => {
    let prevLength = Infinity;

    for (let i = 0; i < ARABIC_SUFFIXES.length; i++) {
      const currentLength = ARABIC_SUFFIXES[i]?.arabic.length ?? 0;

      if (currentLength > prevLength) {
        throw new Error(
          `Suffix at index ${i} ('${ARABIC_SUFFIXES[i]?.arabic}', length ${currentLength}) is longer than previous suffix (length ${prevLength})`,
        );
      }

      prevLength = currentLength;
    }

    // If we get here, the array is properly sorted
    expect(true).toBe(true);
  });

  it('should have longest suffixes first', () => {
    const first = ARABIC_SUFFIXES[0];
    const last = ARABIC_SUFFIXES[ARABIC_SUFFIXES.length - 1];

    expect(first?.arabic.length).toBeGreaterThanOrEqual(last?.arabic.length ?? 0);
  });
});
