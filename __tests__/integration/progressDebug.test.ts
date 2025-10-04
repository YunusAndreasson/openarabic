/**
 * Debug test to understand progress bar behavior
 */

describe('Progress Debug - Counter Flow', () => {
  it('should trace counter updates step by step', () => {
    interface Counters {
      totalWords: number;
      processedWords: number;
      knownWords: number;
    }

    const counters: Counters = {
      totalWords: 3,
      processedWords: 0,
      knownWords: 0,
    };

    function calculateProgress(): number {
      return counters.totalWords > 0
        ? Math.min(Math.round((counters.knownWords / counters.totalWords) * 100), 100)
        : 0;
    }

    function processWord(confidence: 'known' | 'vague' | 'unknown'): void {
      // This mirrors useFSRS.ts lines 293-296
      counters.processedWords += 1;
      if (confidence === 'known') {
        counters.knownWords += 1;
      }
    }

    // Initial state
    expect(calculateProgress()).toBe(0);
    expect(counters).toEqual({ totalWords: 3, processedWords: 0, knownWords: 0 });

    // Word 1: Vague (swipe right with hint)
    processWord('vague');
    expect(counters).toEqual({ totalWords: 3, processedWords: 1, knownWords: 0 });
    expect(calculateProgress()).toBe(0); // Should be 0%

    // Word 2: Known (swipe right without hint)
    processWord('known');
    expect(counters).toEqual({ totalWords: 3, processedWords: 2, knownWords: 1 });
    expect(calculateProgress()).toBe(33); // Should be 33%

    // Word 3: Vague (swipe right with hint)
    processWord('vague');
    expect(counters).toEqual({ totalWords: 3, processedWords: 3, knownWords: 1 });
    expect(calculateProgress()).toBe(33); // Should STILL be 33%

    // Re-presentation of Word 1: Now known (swipe right without hint)
    processWord('known');
    expect(counters).toEqual({ totalWords: 3, processedWords: 4, knownWords: 2 });
    expect(calculateProgress()).toBe(67); // Should be 67%
  });

  it('should verify the exact formula from useFSRS.ts line 349', () => {
    const knownWords = 2;
    const totalWords = 5;

    // Exact formula from useFSRS.ts:349
    const progress = Math.min(Math.round((knownWords / totalWords) * 100), 100);

    expect(progress).toBe(40);
    // NOT 66 (which would be processedWords 2 / totalWords 3)
    // NOT 100 (which would be if vague counted as known)
  });

  it('should demonstrate where the bug COULD be hiding', () => {
    // Hypothesis: Maybe there are TWO counter increments happening somewhere?

    let knownWords = 0;
    const totalWords = 3;

    // Scenario: User swipes right on vague word
    const isHesitating = true;
    const confidence = isHesitating ? 'vague' : 'known';

    // If bug exists, maybe knownWords is being incremented somewhere else
    // Let's check if confidence is being misread
    expect(confidence).toBe('vague'); // This should be vague

    // First increment (correct place - useFSRS.ts:295-296)
    if (confidence === 'known') {
      knownWords += 1;
    }
    expect(knownWords).toBe(0); // Should stay 0

    // Could there be a SECOND increment somewhere?
    // Let's simulate a potential bug: what if processedWords was used instead?
    let processedWords = 1;
    const buggyProgress = Math.round((processedWords / totalWords) * 100);

    // If progress shows 33% after one vague word, then processedWords is being used!
    expect(buggyProgress).toBe(33); // This would be the bug

    const correctProgress = Math.round((knownWords / totalWords) * 100);
    expect(correctProgress).toBe(0); // This is what we want
  });
});
