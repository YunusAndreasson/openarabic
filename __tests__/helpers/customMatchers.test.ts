/**
 * Tests for Custom Jest Matchers
 *
 * Verifies that custom matchers work correctly and provide useful error messages.
 * This ensures matchers are ready for use across the test suite.
 */

import { createTestWord } from './fsrsTestHelpers';

describe('Custom Jest Matchers', () => {
  describe('toBeDueWord', () => {
    it('should pass for words due now or in the past', () => {
      const word = createTestWord({
        fsrs_due: new Date(Date.now() - 1000).toISOString(), // Due 1 second ago
      });

      expect(word).toBeDueWord();
    });

    it('should fail for words due in the future', () => {
      const word = createTestWord({
        fsrs_due: new Date(Date.now() + 86400000).toISOString(), // Due in 1 day
      });

      expect(() => expect(word).toBeDueWord()).toThrow();
    });
  });

  describe('toHaveValidFSRSState', () => {
    it('should pass for word with valid FSRS parameters', () => {
      const word = createTestWord({
        fsrs_stability: 5.5,
        fsrs_difficulty: 6.5,
        fsrs_state: 2,
        fsrs_reps: 3,
        fsrs_lapses: 0,
      });

      expect(word).toHaveValidFSRSState();
    });

    it('should fail for word with stability out of range', () => {
      const word = createTestWord({
        fsrs_stability: 150, // Too high (max 100)
      });

      expect(() => expect(word).toHaveValidFSRSState()).toThrow(/stability.*out of range/);
    });

    it('should fail for word with difficulty out of range', () => {
      const word = createTestWord({
        fsrs_difficulty: 0.5, // Too low (min 1.3)
      });

      expect(() => expect(word).toHaveValidFSRSState()).toThrow(/difficulty.*out of range/);
    });

    it('should fail for word with invalid state', () => {
      const word = createTestWord({
        fsrs_state: 5 as 0, // Invalid state (must be 0-3)
      });

      expect(() => expect(word).toHaveValidFSRSState()).toThrow(/state.*not valid/);
    });

    it('should fail for word with negative reps', () => {
      const word = createTestWord({
        fsrs_reps: -1,
      });

      expect(() => expect(word).toHaveValidFSRSState()).toThrow(/reps.*cannot be negative/);
    });
  });

  describe('toBeValidArabicText', () => {
    it('should pass for valid Arabic text', () => {
      expect('كتاب').toBeValidArabicText();
      expect('والكتاب').toBeValidArabicText();
      expect('في المدرسة').toBeValidArabicText();
    });

    it('should fail for text with non-Arabic characters', () => {
      expect(() => expect('hello').toBeValidArabicText()).toThrow(/valid Arabic text/);
      expect(() => expect('كتاب123').toBeValidArabicText()).toThrow(/valid Arabic text/);
      expect(() => expect('book').toBeValidArabicText()).toThrow(/valid Arabic text/);
    });

    it('should pass for Arabic text with diacritics', () => {
      expect('كِتَابٌ').toBeValidArabicText();
      expect('وَالْكِتَابِ').toBeValidArabicText();
    });
  });

  describe('toHaveStability', () => {
    it('should pass for stability within range', () => {
      const word = createTestWord({ fsrs_stability: 7.5 });
      expect(word).toHaveStability(5, 10);
    });

    it('should fail for stability below minimum', () => {
      const word = createTestWord({ fsrs_stability: 3 });
      expect(() => expect(word).toHaveStability(5, 10)).toThrow(/stability between/);
    });

    it('should fail for stability above maximum', () => {
      const word = createTestWord({ fsrs_stability: 12 });
      expect(() => expect(word).toHaveStability(5, 10)).toThrow(/stability between/);
    });
  });

  describe('toBeInState', () => {
    it('should pass for correct state', () => {
      const word = createTestWord({ fsrs_state: 2 }); // Review state
      expect(word).toBeInState(2);
    });

    it('should fail for incorrect state', () => {
      const word = createTestWord({ fsrs_state: 1 }); // Learning state
      expect(() => expect(word).toBeInState(2)).toThrow(/Review.*Learning/);
    });

    it('should provide helpful error message with state names', () => {
      const word = createTestWord({ fsrs_state: 0 }); // New state
      expect(() => expect(word).toBeInState(2)).toThrow(/New/);
      expect(() => expect(word).toBeInState(2)).toThrow(/Review/);
    });
  });

  describe('toHaveBeenReviewedAtLeast', () => {
    it('should pass for word with sufficient reps', () => {
      const word = createTestWord({ fsrs_reps: 5 });
      expect(word).toHaveBeenReviewedAtLeast(3);
    });

    it('should fail for word with insufficient reps', () => {
      const word = createTestWord({ fsrs_reps: 2 });
      expect(() => expect(word).toHaveBeenReviewedAtLeast(5)).toThrow(/reviewed at least 5 times/);
    });
  });

  describe('toBeOverdueBy', () => {
    it('should pass for word overdue by specified hours', () => {
      const hoursOverdue = 48;
      const word = createTestWord({
        fsrs_due: new Date(Date.now() - hoursOverdue * 60 * 60 * 1000).toISOString(),
      });

      expect(word).toBeOverdueBy(24);
    });

    it('should fail for word not sufficiently overdue', () => {
      const word = createTestWord({
        fsrs_due: new Date(Date.now() - 1000).toISOString(), // Only 1 second overdue
      });

      expect(() => expect(word).toBeOverdueBy(24)).toThrow(/overdue by at least 24 hours/);
    });

    it('should fail for word not yet due', () => {
      const word = createTestWord({
        fsrs_due: new Date(Date.now() + 86400000).toISOString(), // Due in future
      });

      expect(() => expect(word).toBeOverdueBy(1)).toThrow(/overdue/);
    });
  });

  describe('Integration: Using multiple matchers together', () => {
    it('should validate a complete word object', () => {
      const word = createTestWord({
        fsrs_due: new Date(Date.now() - 1000).toISOString(),
        fsrs_stability: 7.2,
        fsrs_difficulty: 5.5,
        fsrs_state: 2,
        fsrs_reps: 5,
        fsrs_lapses: 1,
      });

      // All these should pass
      expect(word).toBeDueWord();
      expect(word).toHaveValidFSRSState();
      expect(word).toHaveStability(5, 10);
      expect(word).toBeInState(2);
      expect(word).toHaveBeenReviewedAtLeast(3);
    });

    it('should work with Arabic word data', () => {
      const word = createTestWord({
        root: {
          id: 1,
          letters: 'كتاب',
          meaning: 'book',
        },
      });

      // Validate Arabic text from root
      if (word.root) {
        expect(word.root.letters).toBeValidArabicText();
      }
    });
  });
});
