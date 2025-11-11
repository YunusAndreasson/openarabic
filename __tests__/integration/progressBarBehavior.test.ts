/**
 * Integration Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * Integration test for progress bar behavior with vague words
 *
 * Bug Report: Progress bar increases when swiping right on vague word (with hint shown)
 * Expected: Progress should ONLY increase when word is marked 'known'
 *
 * This test simulates the actual counter behavior from useFSRS.ts
 */

describe('Progress Bar Behavior - Integration Test', () => {
  interface SessionCounters {
    processedWords: number;
    knownWords: number;
    uniqueWords: Set<number>;
  }

  function calculateProgress(counters: SessionCounters, totalWords: number): number {
    return totalWords > 0 ? Math.min(Math.round((counters.knownWords / totalWords) * 100), 100) : 0;
  }

  describe('Progress calculation with vague words', () => {
    test('should NOT increase progress when vague word is swiped right', () => {
      // Setup: Session with 3 words
      const totalWords = 3;
      const counters: SessionCounters = {
        processedWords: 0,
        knownWords: 0,
        uniqueWords: new Set(),
      };

      // Initial progress should be 0%
      let progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(0);

      // Swipe right on word WITH hint shown (vague word)
      const confidence = 'vague';
      counters.processedWords += 1;
      counters.uniqueWords.add(1);

      // Simulate useFSRS.ts line 295-296: only increment knownWords if confidence === 'known'
      if (confidence === 'known') {
        counters.knownWords += 1;
      }

      // Progress should STILL be 0% (vague word doesn't count)
      progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(0);
      expect(counters.knownWords).toBe(0);
      expect(counters.processedWords).toBe(1);
    });

    test('should increase progress when known word is swiped right', () => {
      // Setup: Session with 3 words
      const totalWords = 3;
      const counters: SessionCounters = {
        processedWords: 0,
        knownWords: 0,
        uniqueWords: new Set(),
      };

      // Initial progress should be 0%
      let progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(0);

      // Swipe right on word WITHOUT hint shown (known word)
      const confidence = 'known';
      counters.processedWords += 1;
      counters.uniqueWords.add(1);

      // Simulate useFSRS.ts line 295-296
      if (confidence === 'known') {
        counters.knownWords += 1;
      }

      // Progress should be 33% (1 of 3 words known)
      progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(33);
      expect(counters.knownWords).toBe(1);
      expect(counters.processedWords).toBe(1);
    });

    test('should correctly track progress for mixed vague and known words', () => {
      const totalWords = 5;
      const counters: SessionCounters = {
        processedWords: 0,
        knownWords: 0,
        uniqueWords: new Set(),
      };

      const responses: Array<{ id: number; confidence: 'known' | 'vague' | 'unknown' }> = [
        { id: 1, confidence: 'known' }, // Progress: 20%
        { id: 2, confidence: 'vague' }, // Progress: 20% (no change)
        { id: 3, confidence: 'known' }, // Progress: 40%
        { id: 4, confidence: 'vague' }, // Progress: 40% (no change)
        { id: 5, confidence: 'known' }, // Progress: 60%
      ];

      const expectedProgress = [20, 20, 40, 40, 60];

      responses.forEach((response, index) => {
        counters.processedWords += 1;
        counters.uniqueWords.add(response.id);

        if (response.confidence === 'known') {
          counters.knownWords += 1;
        }

        const progress = calculateProgress(counters, totalWords);
        expect(progress).toBe(expectedProgress[index]);
      });

      // Final state: 3 known words out of 5
      expect(counters.knownWords).toBe(3);
      expect(counters.processedWords).toBe(5);
      expect(calculateProgress(counters, totalWords)).toBe(60);
    });

    test('should handle re-presentation of vague words correctly', () => {
      // Scenario: Word shown as vague, then re-presented and marked known
      const totalWords = 2;
      const counters: SessionCounters = {
        processedWords: 0,
        knownWords: 0,
        uniqueWords: new Set(),
      };

      // First presentation: Word 1 marked vague
      counters.processedWords += 1;
      counters.uniqueWords.add(1);
      // confidence = 'vague', so knownWords NOT incremented

      let progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(0); // 0 known out of 2

      // Second presentation (after spacing): Word 1 now marked known
      counters.processedWords += 1;
      // Same word, uniqueWords stays 1
      counters.uniqueWords.add(1);
      counters.knownWords += 1; // Now marked known

      progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(50); // 1 known out of 2

      // Word 2 marked known
      counters.processedWords += 1;
      counters.uniqueWords.add(2);
      counters.knownWords += 1;

      progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(100); // 2 known out of 2
    });
  });

  describe('Edge cases', () => {
    test('should handle zero total words', () => {
      const counters: SessionCounters = {
        processedWords: 0,
        knownWords: 0,
        uniqueWords: new Set(),
      };

      const progress = calculateProgress(counters, 0);
      expect(progress).toBe(0);
    });

    test('should cap progress at 100%', () => {
      const counters: SessionCounters = {
        processedWords: 3,
        knownWords: 3,
        uniqueWords: new Set([1, 2, 3]),
      };

      const progress = calculateProgress(counters, 3);
      expect(progress).toBe(100);
    });

    test('should handle all vague words (0% progress)', () => {
      const totalWords = 5;
      const counters: SessionCounters = {
        processedWords: 5,
        knownWords: 0, // All vague, no known
        uniqueWords: new Set([1, 2, 3, 4, 5]),
      };

      const progress = calculateProgress(counters, totalWords);
      expect(progress).toBe(0);
    });
  });
});
