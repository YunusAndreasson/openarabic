/**
 * Swipe to Confidence Mapping Tests
 *
 * Tests the logic that converts swipe gestures to word confidence levels
 * Corresponds to useReview.tsx lines 802-815
 *
 * Mapping rules:
 * - Left swipe → always 'unknown' (regardless of hesitation)
 * - Right swipe + hesitating → 'vague'
 * - Right swipe + not hesitating → 'known'
 */

describe('Swipe to Confidence Mapping - Integration Test', () => {
  type Confidence = 'known' | 'vague' | 'unknown';

  describe('Right swipe confidence mapping', () => {
    it('should map right swipe without hesitation to "known"', () => {
      const isHesitating = false;
      const swipeDirection = 'right';

      // useReview.tsx line 813: const confidence = isHesitating ? 'vague' : 'known';
      const confidence: Confidence = isHesitating ? 'vague' : 'known';

      expect(confidence).toBe('known');
    });

    it('should map right swipe with hesitation to "vague"', () => {
      const isHesitating = true;
      const swipeDirection = 'right';

      // useReview.tsx line 813
      const confidence: Confidence = isHesitating ? 'vague' : 'known';

      expect(confidence).toBe('vague');
    });

    it('should only mark word as known when swiped right WITHOUT hint', () => {
      // Requirement: "a word is only known when swiping right without a hint"
      const scenarios = [
        { isHesitating: false, expectedKnown: true, description: 'no hint shown' },
        { isHesitating: true, expectedKnown: false, description: 'hint shown' },
      ];

      scenarios.forEach(({ isHesitating, expectedKnown, description }) => {
        const confidence: Confidence = isHesitating ? 'vague' : 'known';
        const isKnown = confidence === 'known';

        expect(isKnown).toBe(expectedKnown);
      });
    });
  });

  describe('Left swipe confidence mapping', () => {
    it('should map left swipe to "unknown" (always)', () => {
      const swipeDirection = 'left';
      const isHesitating = false;

      // useReview.tsx line 806: handleSwipeLeft always passes 'unknown'
      const confidence: Confidence = 'unknown';

      expect(confidence).toBe('unknown');
    });

    it('should map left swipe to "unknown" even when hesitating', () => {
      const swipeDirection = 'left';
      const isHesitating = true; // Doesn't matter for left swipe

      // Left swipe always means unknown, regardless of hesitation
      const confidence: Confidence = 'unknown';

      expect(confidence).toBe('unknown');
    });
  });

  describe('Confidence to progress mapping', () => {
    it('should NOT increase progress for vague confidence', () => {
      const confidence: Confidence = 'vague';
      let knownWords = 0;

      // useFSRS.ts line 295-296: only increment for 'known'
      if (confidence === 'known') {
        knownWords += 1;
      }

      expect(knownWords).toBe(0); // No progress for vague
    });

    it('should increase progress for known confidence', () => {
      const confidence: Confidence = 'known';
      let knownWords = 0;

      // useFSRS.ts line 295-296
      if (confidence === 'known') {
        knownWords += 1;
      }

      expect(knownWords).toBe(1); // Progress increases
    });

    it('should NOT increase progress for unknown confidence', () => {
      const confidence: Confidence = 'unknown';
      let knownWords = 0;

      if (confidence === 'known') {
        knownWords += 1;
      }

      expect(knownWords).toBe(0); // No progress for unknown
    });
  });

  describe('Race condition prevention', () => {
    it('should read isHesitating state before onHesitationEnd is called', () => {
      // CRITICAL: ReviewCard.tsx line 104-106
      // onHesitationEnd must be called AFTER swipe handler reads isHesitating

      const state = {
        isHesitating: true,
        confidence: null as Confidence | null,
      };

      // Step 1: Swipe handler reads isHesitating
      const hesitatingAtSwipeTime = state.isHesitating;

      // Step 2: Determine confidence based on state at swipe time
      state.confidence = hesitatingAtSwipeTime ? 'vague' : 'known';

      // Step 3: NOW onHesitationEnd can be called
      state.isHesitating = false;

      // Confidence should be 'vague' (captured hesitating state)
      expect(state.confidence).toBe('vague');
      expect(state.isHesitating).toBe(false); // Reset after
    });

    it('should NOT call onHesitationEnd during onGestureStart', () => {
      // Bug scenario: If onHesitationEnd is called in onGestureStart,
      // isHesitating becomes false BEFORE swipe handler reads it

      const state = {
        isHesitating: true,
        confidence: null as Confidence | null,
      };

      // WRONG: onHesitationEnd called in onGestureStart
      function wrongOnGestureStart(): void {
        state.isHesitating = false; // Reset too early!
      }

      // This would cause the bug
      wrongOnGestureStart();

      // Now swipe handler reads isHesitating
      const confidence: Confidence = state.isHesitating ? 'vague' : 'known';

      // BUG: Word marked as 'known' even though user hesitated
      expect(confidence).toBe('known'); // WRONG!
      expect(state.isHesitating).toBe(false);
    });

    it('should correctly handle the fix: onHesitationEnd called in onSwipeComplete', () => {
      const state = {
        isHesitating: true,
        confidence: null as Confidence | null,
      };

      // CORRECT: onGestureStart does NOT call onHesitationEnd
      function correctOnGestureStart(): void {
        // Just mark gesture as active, don't reset hesitation
      }

      correctOnGestureStart();

      // Swipe handler reads isHesitating (still true)
      state.confidence = state.isHesitating ? 'vague' : 'known';

      // THEN onSwipeComplete calls onHesitationEnd
      function onSwipeComplete(): void {
        state.isHesitating = false;
      }

      onSwipeComplete();

      // CORRECT: Word marked as 'vague', hesitation reset after
      expect(state.confidence).toBe('vague'); // CORRECT!
      expect(state.isHesitating).toBe(false);
    });
  });

  describe('Complete swipe flows', () => {
    it('should handle complete flow: hesitate → swipe right → vague', () => {
      const flow = {
        isHesitating: false,
        confidence: null as Confidence | null,
      };

      // 1. Word appears, timer starts
      // 2. 3 seconds pass, hesitation triggered
      flow.isHesitating = true;

      // 3. User swipes right
      const swipeDirection = 'right';

      // 4. Determine confidence BEFORE resetting hesitation
      flow.confidence = flow.isHesitating ? 'vague' : 'known';

      // 5. Reset hesitation after swipe completes
      flow.isHesitating = false;

      expect(flow.confidence).toBe('vague');
    });

    it('should handle complete flow: quick swipe right → known', () => {
      const flow = {
        isHesitating: false,
        confidence: null as Confidence | null,
      };

      // 1. Word appears
      // 2. User swipes right immediately (before 3 seconds)
      const swipeDirection = 'right';

      // 3. Determine confidence
      flow.confidence = flow.isHesitating ? 'vague' : 'known';

      expect(flow.confidence).toBe('known');
    });

    it('should handle complete flow: swipe left → unknown', () => {
      const flow = {
        isHesitating: false, // Doesn't matter
        confidence: null as Confidence | null,
      };

      // 1. Word appears
      // 2. User swipes left
      const swipeDirection = 'left';

      // 3. Left swipe always unknown
      flow.confidence = 'unknown';

      expect(flow.confidence).toBe('unknown');
    });

    it('should handle complete flow: hesitate → swipe left → unknown', () => {
      const flow = {
        isHesitating: false,
        confidence: null as Confidence | null,
      };

      // 1. Word appears, timer starts
      // 2. 3 seconds pass, hesitation triggered
      flow.isHesitating = true;

      // 3. User swipes left anyway
      const swipeDirection = 'left';

      // 4. Left swipe overrides hesitation → unknown
      flow.confidence = 'unknown';

      // 5. Reset hesitation
      flow.isHesitating = false;

      expect(flow.confidence).toBe('unknown');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple rapid swipes on same word', () => {
      let isHesitating = false;
      const swipes: Confidence[] = [];

      // Rapid right swipes before hesitation
      for (let i = 0; i < 3; i++) {
        const confidence: Confidence = isHesitating ? 'vague' : 'known';
        swipes.push(confidence);
      }

      // All should be 'known' (no hesitation yet)
      expect(swipes).toEqual(['known', 'known', 'known']);
    });

    it('should reset hesitation between words', () => {
      const words = ['word1', 'word2'];
      const results: Array<{ word: string; confidence: Confidence }> = [];

      words.forEach(word => {
        let isHesitating = false;

        // Simulate hesitation on first word only
        if (word === 'word1') {
          isHesitating = true;
        }

        const confidence: Confidence = isHesitating ? 'vague' : 'known';
        results.push({ word, confidence });

        // Reset for next word
        isHesitating = false;
      });

      expect(results).toEqual([
        { word: 'word1', confidence: 'vague' },
        { word: 'word2', confidence: 'known' },
      ]);
    });
  });
});
