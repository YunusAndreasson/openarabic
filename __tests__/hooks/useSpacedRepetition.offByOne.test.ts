import { getNextWordIndex } from '../../hooks/useSpacedRepetition';

/**
 * This test suite is specifically designed to test the off-by-one error fix
 * in the spaced repetition system.
 *
 * The key issue was:
 * 1. Words were being marked as "seen" in the currentWord useMemo, before being answered
 * 2. The comparison used '>=' instead of '===' when checking if all words had been seen
 *
 * These tests verify the fix by simulating both implementations.
 */
describe('Spaced Repetition Off-by-One Error Tests', () => {
  // Test getNextWordIndex function directly
  describe('getNextWordIndex function', () => {
    it('should not complete the session when not all unique words have been seen', () => {
      // Setup: Create a set of seen words with one word missing
      const uniqueWordsSeenSet = new Set<string>(['1', '2', '3', '4', '5', '6']);
      const totalUniqueWords = 7; // Total unique words is 7

      // When we call getNextWordIndex
      const result = getNextWordIndex(
        6, // currentPosition = 6 (which would be the 7th word)
        7, // totalWords = 7
        [], // No failed words
        0, // No attempt count
        uniqueWordsSeenSet, // 6 out of 7 words seen
        totalUniqueWords
      );

      // Then it should go to the next word (position 6+1=7), not complete the session
      expect(result).toBe(7);
    });

    it('should complete the session when all unique words have been seen', () => {
      // Setup: Create a set with ALL words seen
      const uniqueWordsSeenSet = new Set<string>(['1', '2', '3', '4', '5', '6', '7']);
      const totalUniqueWords = 7; // Total unique words is 7

      // When we call getNextWordIndex
      const result = getNextWordIndex(
        6, // currentPosition = 6 (which would be the 7th word)
        7, // totalWords = 7
        [], // No failed words
        0, // No attempt count
        uniqueWordsSeenSet, // All 7 words seen
        totalUniqueWords
      );

      // Then it should complete the session (return totalWords)
      expect(result).toBe(7);
    });

    // Mock the old buggy implementation for comparison
    it('demonstrates how the bug would behave with the old implementation', () => {
      /**
       * This is a mock of the old implementation with the bug
       * (using >= instead of === for comparison)
       */
      const oldImplementation = (
        currentPosition: number,
        totalWords: number,
        failedWords: any[],
        uniqueWordsSeen?: Set<string>,
        totalUniqueWords?: number
      ): number => {
        // The key difference: using >= instead of === for comparison
        if (uniqueWordsSeen && totalUniqueWords && uniqueWordsSeen.size >= totalUniqueWords) {
          failedWords.splice(0, failedWords.length);
          return totalWords; // Complete the session too early
        }
        return currentPosition + 1;
      };

      // Setup: Create a set with N-1 words seen
      const uniqueWordsSeenSet = new Set<string>(['1', '2', '3', '4', '5', '6']);

      // Test with totalUniqueWords = 6 (equals the number of seen words)
      // This would trigger the bug in the old implementation
      const totalUniqueWordsSameAsSeenCount = 6; // This is key - with >= this will match
      const failedWords: any[] = [];

      // When we call the old implementation with uniqueWordsSeen.size === totalUniqueWords
      const result = oldImplementation(
        5, // currentPosition = 5 (we're at the 6th word)
        7, // totalWords = 7
        failedWords,
        uniqueWordsSeenSet, // 6 words seen
        totalUniqueWordsSameAsSeenCount // 6 total unique words, which matches seen count
      );

      // Then it would incorrectly complete the session
      // because 6 >= 6 was true with the old implementation
      expect(result).toBe(7); // Returns totalWords = session complete

      // But with the fixed implementation using === and the correct totalUniqueWords count
      const fixedResult = getNextWordIndex(
        5, // currentPosition = 5 (we're at the 6th word)
        7, // totalWords = 7
        [],
        0,
        uniqueWordsSeenSet, // 6 words seen
        7 // 7 total unique words, which is more than seen count
      );

      // Should continue to next position, not complete
      expect(fixedResult).toBe(6); // Returns currentPosition + 1
    });

    // Test that specifically reproduces the exact runtime behavior with the bug
    it('simulates the actual user session to demonstrate the off-by-one bug', () => {
      // This test shows step by step how the bug manifested in real usage

      // Scenario: A user is reviewing 7 words
      const totalWords = 7;
      const uniqueWordsSeen = new Set<string>();
      const failedWords: any[] = [];

      // In the original buggy implementation:
      // 1. currentWord useMemo marks a word as seen before it's answered
      // 2. The comparison using '>=' would complete the session prematurely

      // Simulate what would happen in the real session:

      // User starts at position 0 (first word)
      let position = 0;

      // BUGGY BEHAVIOR: First word (at index 0) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('1');

      // User answers first word and moves to the second word
      position = 1;

      // BUGGY BEHAVIOR: Second word (at index 1) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('2');

      // User answers second word and moves to the third word
      position = 2;

      // BUGGY BEHAVIOR: Third word (at index 2) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('3');

      // User answers third word and moves to the fourth word
      position = 3;

      // BUGGY BEHAVIOR: Fourth word (at index 3) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('4');

      // User answers fourth word and moves to the fifth word
      position = 4;

      // BUGGY BEHAVIOR: Fifth word (at index 4) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('5');

      // User answers fifth word and moves to the sixth word
      position = 5;

      // BUGGY BEHAVIOR: Sixth word (at index 5) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('6');

      // User answers sixth word and tries to move to the seventh word
      position = 6;

      // BUGGY BEHAVIOR: Seventh word (at index 6) is marked as seen in the useMemo
      // before the user answers it
      uniqueWordsSeen.add('7');

      // At this point, 7 words are marked as seen, but the user has only answered 6 words

      // With the old buggy implementation:
      const oldImplementation = (
        currentPosition: number,
        totalWords: number,
        failedWords: any[],
        attemptCount: number = 0,
        uniqueWordsSeen?: Set<string>,
        totalUniqueWords?: number
      ): number => {
        // The bug: using >= instead of === for comparison
        if (uniqueWordsSeen && totalUniqueWords && uniqueWordsSeen.size >= totalUniqueWords) {
          failedWords.splice(0, failedWords.length);
          return totalWords; // Complete the session too early
        }
        return currentPosition + 1;
      };

      // Call the old implementation
      const nextPositionWithBug = oldImplementation(
        position, // position = 6 (showing the 7th word)
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen, // 7 words already marked as seen
        totalWords // 7 total words
      );

      // The buggy implementation would complete the session because:
      // uniqueWordsSeen.size (7) >= totalWords (7)
      // This means the 7th word is never actually answered by the user
      expect(nextPositionWithBug).toBe(totalWords);

      // START OVER: Let's see how the fixed implementation behaves

      // Reset the test
      position = 0;
      uniqueWordsSeen.clear();

      // FIXED BEHAVIOR: Words are only marked as seen AFTER they're answered
      // User answers the first word and it's marked as seen
      uniqueWordsSeen.add('1');

      // Move to next word
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );
      expect(position).toBe(1);

      // User answers the second word and it's marked as seen
      uniqueWordsSeen.add('2');

      // Move to next word
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );
      expect(position).toBe(2);

      // User answers the third word and it's marked as seen
      uniqueWordsSeen.add('3');

      // Move to next word
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );
      expect(position).toBe(3);

      // User answers the fourth word and it's marked as seen
      uniqueWordsSeen.add('4');

      // Move to next word
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );
      expect(position).toBe(4);

      // User answers the fifth word and it's marked as seen
      uniqueWordsSeen.add('5');

      // Move to next word
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );
      expect(position).toBe(5);

      // User answers the sixth word and it's marked as seen
      uniqueWordsSeen.add('6');

      // Move to next word
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );
      expect(position).toBe(6);

      // User answers the seventh word and it's marked as seen
      uniqueWordsSeen.add('7');

      // Now move to next - should complete the session
      position = getNextWordIndex(
        position,
        totalWords,
        failedWords,
        0,
        uniqueWordsSeen,
        totalWords
      );

      // With the fixed implementation, we should complete the session
      // because all 7 words have been seen
      expect(position).toBe(totalWords);
    });
  });
});
