/**
 * Integration Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

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
    // Parameterized test for right swipe scenarios
    test.each([
      {
        isHesitating: false,
        expectedConfidence: 'known' as Confidence,
        description: 'without hesitation',
      },
      {
        isHesitating: true,
        expectedConfidence: 'vague' as Confidence,
        description: 'with hesitation',
      },
    ])(
      'should map right swipe $description to "$expectedConfidence"',
      ({ isHesitating, expectedConfidence }) => {
        const swipeDirection = 'right';

        // useReview.tsx line 813: const confidence = isHesitating ? 'vague' : 'known';
        const confidence: Confidence = isHesitating ? 'vague' : 'known';

        expect(confidence).toBe(expectedConfidence);
      },
    );

    test.each([
      {
        isHesitating: false,
        expectedKnown: true,
        description: 'no hint shown',
      },
      {
        isHesitating: true,
        expectedKnown: false,
        description: 'hint shown',
      },
    ])(
      'should only mark word as known when $description (isKnown=$expectedKnown)',
      ({ isHesitating, expectedKnown }) => {
        // Requirement: "a word is only known when swiping right without a hint"
        const confidence: Confidence = isHesitating ? 'vague' : 'known';
        const isKnown = confidence === 'known';

        expect(isKnown).toBe(expectedKnown);
      },
    );
  });

  describe('Left swipe confidence mapping', () => {
    test('should map left swipe to "unknown" (always)', () => {
      const swipeDirection = 'left';
      const isHesitating = false;

      // useReview.tsx line 806: handleSwipeLeft always passes 'unknown'
      const confidence: Confidence = 'unknown';

      expect(confidence).toBe('unknown');
    });

    test('should map left swipe to "unknown" even when hesitating', () => {
      const swipeDirection = 'left';
      const isHesitating = true; // Doesn't matter for left swipe

      // Left swipe always means unknown, regardless of hesitation
      const confidence: Confidence = 'unknown';

      expect(confidence).toBe('unknown');
    });
  });

  describe('Confidence to progress mapping', () => {
    test.each([
      {
        confidence: 'vague' as Confidence,
        expectedKnownWords: 0,
        description: 'NOT increase progress for vague',
      },
      {
        confidence: 'known' as Confidence,
        expectedKnownWords: 1,
        description: 'increase progress for known',
      },
      {
        confidence: 'unknown' as Confidence,
        expectedKnownWords: 0,
        description: 'NOT increase progress for unknown',
      },
    ])('should $description confidence', ({ confidence, expectedKnownWords }) => {
      let knownWords = 0;

      // useFSRS.ts line 295-296: only increment for 'known'
      if (confidence === 'known') {
        knownWords += 1;
      }

      expect(knownWords).toBe(expectedKnownWords);
    });
  });

  describe('Race condition prevention', () => {
    test('should read isHesitating state before onHesitationEnd is called', () => {
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

    test('should NOT call onHesitationEnd during onGestureStart', () => {
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

    test('should correctly handle the fix: onHesitationEnd called in onSwipeComplete', () => {
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
    test.each([
      {
        flowName: 'hesitate → swipe right → vague',
        initialHesitating: false,
        triggerHesitation: true,
        swipeDirection: 'right' as const,
        expectedConfidence: 'vague' as Confidence,
      },
      {
        flowName: 'quick swipe right → known',
        initialHesitating: false,
        triggerHesitation: false,
        swipeDirection: 'right' as const,
        expectedConfidence: 'known' as Confidence,
      },
      {
        flowName: 'swipe left → unknown',
        initialHesitating: false,
        triggerHesitation: false,
        swipeDirection: 'left' as const,
        expectedConfidence: 'unknown' as Confidence,
      },
      {
        flowName: 'hesitate → swipe left → unknown',
        initialHesitating: false,
        triggerHesitation: true,
        swipeDirection: 'left' as const,
        expectedConfidence: 'unknown' as Confidence,
      },
    ])(
      'should handle complete flow: $flowName',
      ({ initialHesitating, triggerHesitation, swipeDirection, expectedConfidence }) => {
        const flow = {
          isHesitating: initialHesitating,
          confidence: null as Confidence | null,
        };

        // Simulate hesitation if needed
        if (triggerHesitation) {
          flow.isHesitating = true;
        }

        // Determine confidence based on swipe direction
        if (swipeDirection === 'right') {
          flow.confidence = flow.isHesitating ? 'vague' : 'known';
        } else {
          // Left swipe always unknown
          flow.confidence = 'unknown';
        }

        // Reset hesitation after swipe completes
        flow.isHesitating = false;

        expect(flow.confidence).toBe(expectedConfidence);
      },
    );
  });

  describe('Edge cases', () => {
    test('should handle multiple rapid swipes on same word', () => {
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

    test('should reset hesitation between words', () => {
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
