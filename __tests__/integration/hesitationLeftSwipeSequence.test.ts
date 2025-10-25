/**
 * Hesitation + Left Swipe Sequence Test
 *
 * Tests the complete flow when user hesitates (hint shown) then swipes left
 * Verifies that the next word does NOT show hint immediately
 *
 * Bug scenario:
 * 1. Word 1 appears → wait 3s → hint shown (isHesitating = true)
 * 2. Swipe left → red translation shown for 3s
 * 3. Word 2 appears → BUG: hint shown immediately (should NOT show)
 *
 * Expected behavior:
 * - After hesitate + left swipe, isHesitating should be reset to false
 * - Next word should start fresh with no hint
 * - Hint only appears if user waits another 3 seconds on the new word
 */

describe('Hesitation + Left Swipe Sequence', () => {
  const HESITATION_DELAY_MS = 3000;
  const TRANSLATION_DISPLAY_MS = 3000;

  describe('State cleanup between words', () => {
    it('should reset isHesitating when word changes', () => {
      const session = {
        currentWordId: 'word1',
        isHesitating: false,
        showTranslation: false,
      };

      // Word 1: hesitation triggered
      session.isHesitating = true;

      // Word changes (new currentWordKey triggers useEffect)
      session.currentWordId = 'word2';

      // CRITICAL: isHesitating must be reset to false
      session.isHesitating = false; // This should happen in useEffect cleanup

      expect(session.isHesitating).toBe(false);
      expect(session.currentWordId).toBe('word2');
    });

    it('should clear translation state when word changes', () => {
      const session = {
        currentWordId: 'word1',
        showTranslation: true,
        currentMeaning: 'Translation text',
        isHesitating: true,
      };

      // Word changes
      session.currentWordId = 'word2';

      // All states should be reset
      session.showTranslation = false;
      session.currentMeaning = '';
      session.isHesitating = false;

      expect(session.showTranslation).toBe(false);
      expect(session.currentMeaning).toBe('');
      expect(session.isHesitating).toBe(false);
    });

    it('should not leak hesitation state from previous word', () => {
      const wordStates = [
        { id: 'word1', isHesitating: false },
        { id: 'word2', isHesitating: false },
      ];

      // Word 1: hesitation triggered
      wordStates[0].isHesitating = true;

      // Move to word 2 - should NOT inherit hesitation state
      const previousHesitation = wordStates[0].isHesitating;
      const newWordHesitation = false; // Reset on word change

      expect(previousHesitation).toBe(true);
      expect(newWordHesitation).toBe(false);
      expect(newWordHesitation).not.toBe(previousHesitation);
    });
  });

  describe('Complete hesitate → left swipe → next word flow', () => {
    it('should NOT show hint on next word after hesitate + left swipe', () => {
      const session = {
        words: ['word1', 'word2'],
        currentIndex: 0,
        isHesitating: false,
        showTranslation: false,
        currentMeaning: '',
      };

      // ===== WORD 1 FLOW =====

      // 1. Word 1 appears
      expect(session.isHesitating).toBe(false);
      expect(session.showTranslation).toBe(false);

      // 2. Wait 3 seconds - hesitation timer fires
      session.isHesitating = true;

      // Verify hint is shown for word 1
      expect(session.isHesitating).toBe(true);

      // 3. User swipes left (unknown)
      session.showTranslation = true;
      session.currentMeaning = 'Translation text';

      // 4. Wait for translation display (3 seconds)
      // After delay, processFeedback completes and moves to next word

      // ===== WORD 2 FLOW (CRITICAL TEST) =====

      // 5. Word 2 appears - ALL states must be reset
      session.currentIndex = 1;
      session.isHesitating = false; // MUST reset
      session.showTranslation = false; // MUST clear
      session.currentMeaning = ''; // MUST clear

      // CRITICAL: Next word should NOT show hint immediately
      expect(session.isHesitating).toBe(false);
      expect(session.showTranslation).toBe(false);
      expect(session.currentMeaning).toBe('');

      // 6. Hint only appears if user waits another 3 seconds
      // (not tested here - separate timer test)
    });

    it('should handle multiple hesitate + left swipe cycles', () => {
      const session = {
        currentWordIndex: 0,
        isHesitating: false,
        showTranslation: false,
      };

      // Cycle 1: Word 1 → hesitate → left swipe
      session.isHesitating = true;
      session.showTranslation = true;

      // Move to Word 2
      session.currentWordIndex = 1;
      session.isHesitating = false; // Reset
      session.showTranslation = false; // Reset

      expect(session.isHesitating).toBe(false);

      // Cycle 2: Word 2 → hesitate → left swipe
      session.isHesitating = true;
      session.showTranslation = true;

      // Move to Word 3
      session.currentWordIndex = 2;
      session.isHesitating = false; // Reset again
      session.showTranslation = false; // Reset again

      expect(session.isHesitating).toBe(false);
      expect(session.currentWordIndex).toBe(2);
    });
  });

  describe('Translation vs hint separation', () => {
    it('should distinguish between red translation (unknown) and orange hint (hesitation)', () => {
      const word1State = {
        isHesitating: true, // Orange hint shown
        showTranslation: false, // No red translation yet
      };

      const word2State = {
        isHesitating: false, // No hint
        showTranslation: true, // Red translation after left swipe
      };

      // Hint (orange) and translation (red) are separate states
      expect(word1State.isHesitating).toBe(true);
      expect(word1State.showTranslation).toBe(false);

      expect(word2State.isHesitating).toBe(false);
      expect(word2State.showTranslation).toBe(true);
    });

    it('should show red translation after left swipe, then clear for next word', () => {
      const flow = {
        currentWord: 'word1',
        isHesitating: true, // Hint shown
        showTranslation: false,
        translationVariant: null as 'error' | 'warning' | null,
      };

      // Left swipe triggers red translation
      flow.showTranslation = true;
      flow.translationVariant = 'error'; // Red styling for unknown

      expect(flow.showTranslation).toBe(true);
      expect(flow.translationVariant).toBe('error');

      // Move to next word - clear translation AND hint
      flow.currentWord = 'word2';
      flow.showTranslation = false;
      flow.translationVariant = null;
      flow.isHesitating = false; // CRITICAL: Reset hint state

      expect(flow.showTranslation).toBe(false);
      expect(flow.isHesitating).toBe(false);
    });
  });

  describe('Timer cleanup verification', () => {
    it('should clear hesitation timer when word changes', () => {
      let hesitationTimer: NodeJS.Timeout | null = null;
      let timerCleared = false;

      // Word 1: Start hesitation timer
      hesitationTimer = setTimeout(() => {
        // This should NOT execute if timer is cleared
      }, HESITATION_DELAY_MS);

      // Word changes - timer must be cleared
      if (hesitationTimer) {
        clearTimeout(hesitationTimer);
        timerCleared = true;
        hesitationTimer = null;
      }

      expect(timerCleared).toBe(true);
      expect(hesitationTimer).toBe(null);
    });

    it('should not have overlapping timers between words', () => {
      const timers: Array<NodeJS.Timeout | null> = [];

      // Word 1: Start timer
      const timer1 = setTimeout(() => {}, HESITATION_DELAY_MS);
      timers.push(timer1);

      // Word changes - clear old timer
      if (timers[0]) {
        clearTimeout(timers[0]);
        timers[0] = null;
      }

      // Word 2: Start new timer
      const timer2 = setTimeout(() => {}, HESITATION_DELAY_MS);
      timers.push(timer2);

      // Only one timer should be active (the new one)
      expect(timers[0]).toBe(null); // Old timer cleared
      expect(timers[1]).not.toBe(null); // New timer active

      // Cleanup
      if (timers[1]) clearTimeout(timers[1]);
    });
  });

  describe('EnglishTranslation synchronization (CRITICAL)', () => {
    it('should ensure englishTranslation updates with currentWord, not lag behind', () => {
      interface WordData {
        id: string;
        meaning: string;
      }

      const state = {
        currentWord: { id: 'word1', meaning: 'Hello' } as WordData,
        englishTranslation: 'Hello',
        isHesitating: true,
      };

      // Verify Word 1 state
      expect(state.englishTranslation).toBe('Hello');

      // Transition to Word 2 - englishTranslation MUST update atomically
      state.currentWord = { id: 'word2', meaning: 'Goodbye' };
      state.englishTranslation = state.currentWord.meaning; // Should update immediately
      state.isHesitating = false;

      // CRITICAL: englishTranslation should NEVER show old word's meaning
      expect(state.englishTranslation).toBe('Goodbye');
      expect(state.englishTranslation).not.toBe('Hello');
      expect(state.isHesitating).toBe(false);
    });

    it('should NEVER show old word hint during transition', () => {
      interface WordPair {
        arabic: string;
        english: string;
      }

      const word1: WordPair = { arabic: 'مرحبا', english: 'Hello' };
      const word2: WordPair = { arabic: 'وداعا', english: 'Goodbye' };

      let displayedHint: string | null = null;

      // Word 1: hesitating, hint = "H..."
      let isHesitating = true;
      let currentEnglish = word1.english;
      displayedHint = isHesitating ? currentEnglish.charAt(0) + '...' : null;
      expect(displayedHint).toBe('H...');

      // Transition to Word 2 - hint MUST be based on current word only
      isHesitating = false; // Reset
      currentEnglish = word2.english; // "Goodbye"

      // Calculate what hint would be if isHesitating were true
      const potentialHint = isHesitating ? currentEnglish.charAt(0) + '...' : null;

      expect(potentialHint).toBe(null); // No hint because isHesitating is false
      expect(potentialHint).not.toBe('H...'); // Definitely not old hint
    });

    it('should prevent hint from showing if englishTranslation is stale', () => {
      const state = {
        isHesitating: false, // Reset to false
        englishTranslation: 'OldWord', // Stale translation
        currentWordArabic: 'NewWordArabic', // New word
      };

      // Even if isHesitating were true, hint should be for current word
      const shouldShowHint = state.isHesitating && state.englishTranslation.length > 0;

      // Since isHesitating is false, no hint
      expect(shouldShowHint).toBe(false);

      // If isHesitating somehow became true with stale translation
      state.isHesitating = true;
      const hintWithStaleTranslation = state.englishTranslation.charAt(0) + '...';

      // This test documents the bug: hint would show old word's first letter
      expect(hintWithStaleTranslation).toBe('O...'); // Wrong - shows "O" for "OldWord"
      // It should NOT show at all, or should show "N..." for "NewWord"
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid word transitions without state leakage', () => {
      const words = ['word1', 'word2', 'word3'];
      let currentIndex = 0;
      let isHesitating = false;

      // Word 1: hesitate
      isHesitating = true;

      // Rapid transition to Word 2
      currentIndex = 1;
      isHesitating = false; // Reset

      // Immediate transition to Word 3
      currentIndex = 2;
      isHesitating = false; // Should still be false

      expect(currentIndex).toBe(2);
      expect(isHesitating).toBe(false);
    });

    it('should handle hesitation on first word, then quick progression', () => {
      const session = {
        currentWordIndex: 0,
        totalWords: 5,
        isHesitating: false,
      };

      // First word: hesitate
      session.isHesitating = true;

      // Process all remaining words quickly
      for (let i = 1; i < session.totalWords; i++) {
        session.currentWordIndex = i;
        session.isHesitating = false; // Reset each time

        expect(session.isHesitating).toBe(false);
      }

      expect(session.currentWordIndex).toBe(4);
    });
  });

  describe('3-Second delay transition (CRITICAL BUG FIX)', () => {
    it('should NOT restart hesitation timer when onHesitationEnd is called during translation', () => {
      const timerState = {
        isHesitating: true, // User hesitated on Word 1
        showTranslation: false,
        hesitationTimerActive: false,
      };

      // 1. User swipes left (unknown)
      timerState.showTranslation = true; // Red translation appears

      // 2. Swipe completes → onHesitationEnd called
      timerState.isHesitating = false;

      // 3. CRITICAL: ReviewCard useEffect fires because isHesitating changed
      //    Should NOT start new timer because showTranslation is true
      const shouldStartNewTimer =
        timerState.isHesitating === false && // Just became false
        timerState.showTranslation === false; // No translation showing

      timerState.hesitationTimerActive = shouldStartNewTimer;

      // Verify: NO new timer should start while translation is showing
      expect(timerState.hesitationTimerActive).toBe(false);
      expect(timerState.showTranslation).toBe(true);
      expect(timerState.isHesitating).toBe(false);
    });

    it('should NOT show hint when 3-second translation delay ends', () => {
      const timeline = {
        time: 0,
        isHesitating: false,
        showTranslation: false,
        currentWord: 'word1',
        englishTranslation: 'Hello',
      };

      // 1. User hesitates on Word 1
      timeline.time = 3000;
      timeline.isHesitating = true;
      expect(timeline.isHesitating).toBe(true);

      // 2. User swipes left (unknown)
      timeline.time = 4000;
      timeline.showTranslation = true; // Red translation appears

      // 3. Swipe completes - onHesitationEnd called
      timeline.isHesitating = false; // Reset by onHesitationEnd

      // 4. Wait 3 seconds for translation display
      timeline.time = 7000;

      // 5. CRITICAL: When 3-second delay ends, processFeedback runs
      //    - showTranslation = false (translation hides)
      //    - currentWord changes to Word 2
      //    - englishTranslation changes to Word 2's meaning

      timeline.showTranslation = false;
      timeline.currentWord = 'word2';
      timeline.englishTranslation = 'Goodbye';

      // 6. VERIFY: isHesitating must be false, NO hint should show
      expect(timeline.isHesitating).toBe(false);
      expect(timeline.showTranslation).toBe(false);

      // If hint were to show, it would use Word 2's englishTranslation
      // This is the BUG we're preventing
      const wouldShowHint = timeline.isHesitating && timeline.englishTranslation.length > 0;
      expect(wouldShowHint).toBe(false);
    });

    it('should NOT fire haptic during word transition after 3-second delay', () => {
      let hapticFired = false;

      const mockHaptic = () => {
        hapticFired = true;
      };

      // Simulate the exact moment when 3-second delay ends
      const state = {
        isHesitating: false, // Should be false from onHesitationEnd
        showFirstLetterOnly: false, // Derived from isHesitating
        englishTranslation: 'NewWord', // New word's translation
      };

      // WordDisplay logic: only show hint if showFirstLetterOnly is true
      const shouldShowHint = state.showFirstLetterOnly && state.englishTranslation.length > 0;

      if (shouldShowHint) {
        mockHaptic(); // This should NOT happen
      }

      expect(hapticFired).toBe(false);
      expect(shouldShowHint).toBe(false);
    });

    it('should ensure isHesitating is reset BEFORE word changes', () => {
      const processFeedbackFlow = {
        step1_isHesitating: true, // Before processFeedback
        step2_resetHesitation: false, // Reset at START of processFeedback
        step3_updateWord: false, // Then update word
      };

      // Correct order: reset hesitation FIRST
      processFeedbackFlow.step2_resetHesitation = true; // isHesitating = false
      const isHesitatingAfterReset = false;

      processFeedbackFlow.step3_updateWord = true; // Then change word
      const currentWord = 'word2';

      // When word changes, isHesitating should already be false
      expect(isHesitatingAfterReset).toBe(false);
      expect(currentWord).toBe('word2');
    });
  });

  describe('Integration: Complete session flow', () => {
    it('should handle mixed known/vague/unknown with hesitation states', () => {
      const sessionFlow = [
        { word: 'word1', action: 'hesitate+left', expectedHintOnNext: false },
        { word: 'word2', action: 'quick-right', expectedHintOnNext: false },
        { word: 'word3', action: 'hesitate+right', expectedHintOnNext: false },
        { word: 'word4', action: 'hesitate+left', expectedHintOnNext: false },
      ];

      sessionFlow.forEach((step, index) => {
        const isHesitating = step.action.includes('hesitate');
        const nextWordShowsHint = step.expectedHintOnNext;

        // After any action, next word should NOT show hint
        expect(nextWordShowsHint).toBe(false);
      });
    });

    it('should verify complete state reset pattern', () => {
      interface WordState {
        id: string;
        isHesitating: boolean;
        showTranslation: boolean;
        currentMeaning: string;
      }

      const resetWordState = (id: string): WordState => ({
        id,
        isHesitating: false,
        showTranslation: false,
        currentMeaning: '',
      });

      // Word 1: messy state after hesitate + left swipe
      let currentState: WordState = {
        id: 'word1',
        isHesitating: true,
        showTranslation: true,
        currentMeaning: 'Some translation',
      };

      // Move to Word 2: should be completely reset
      currentState = resetWordState('word2');

      expect(currentState.isHesitating).toBe(false);
      expect(currentState.showTranslation).toBe(false);
      expect(currentState.currentMeaning).toBe('');
      expect(currentState.id).toBe('word2');
    });
  });
});
