import {
  SCRUBBER_CONSTANTS,
  calculatePosition,
  calculateProgressFromIndex,
  calculateSentenceIndex,
  validateProgress,
  validateSentenceIndex,
} from '@/utils/gestureUtils';

describe('Scrubber Utilities', () => {
  describe('SCRUBBER_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(SCRUBBER_CONSTANTS.HANDLE_SIZE).toBe(20);
      expect(SCRUBBER_CONSTANTS.HANDLE_SIZE_ACTIVE).toBe(28);
      expect(SCRUBBER_CONSTANTS.TRACK_HEIGHT).toBe(4);
      expect(SCRUBBER_CONSTANTS.TRACK_HEIGHT_ACTIVE).toBe(12);
      expect(SCRUBBER_CONSTANTS.DEFAULT_TRACK_WIDTH).toBe(300);
    });
  });

  describe('calculatePosition', () => {
    it('should calculate position correctly for progress 0', () => {
      const result = calculatePosition(0, 300);
      expect(result).toBe(0);
    });

    it('should calculate position correctly for progress 0.5', () => {
      const result = calculatePosition(0.5, 300);
      expect(result).toBe(140); // 0.5 * (300 - 20)
    });

    it('should calculate position correctly for progress 1', () => {
      const result = calculatePosition(1, 300);
      expect(result).toBe(280); // 1 * (300 - 20)
    });

    it('should use custom handle size', () => {
      const result = calculatePosition(0.5, 300, 30);
      expect(result).toBe(135); // 0.5 * (300 - 30)
    });
  });

  describe('validateProgress', () => {
    it('should clamp negative values to 0', () => {
      expect(validateProgress(-0.5)).toBe(0);
      expect(validateProgress(-1)).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      expect(validateProgress(1.5)).toBe(1);
      expect(validateProgress(2)).toBe(1);
    });

    it('should return valid values unchanged', () => {
      expect(validateProgress(0)).toBe(0);
      expect(validateProgress(0.5)).toBe(0.5);
      expect(validateProgress(1)).toBe(1);
    });
  });

  describe('calculateSentenceIndex', () => {
    it('should calculate index for progress 0', () => {
      expect(calculateSentenceIndex(0, 10)).toBe(0);
    });

    it('should calculate index for progress 0.5', () => {
      expect(calculateSentenceIndex(0.5, 10)).toBe(5);
    });

    it('should calculate index for progress 1', () => {
      expect(calculateSentenceIndex(1, 10)).toBe(9);
    });

    it('should handle single sentence', () => {
      expect(calculateSentenceIndex(0.5, 1)).toBe(0);
    });

    it('should validate progress before calculation', () => {
      expect(calculateSentenceIndex(-0.5, 10)).toBe(0);
      expect(calculateSentenceIndex(1.5, 10)).toBe(9);
    });
  });

  describe('calculateProgressFromIndex', () => {
    it('should calculate progress for first sentence', () => {
      expect(calculateProgressFromIndex(0, 10)).toBe(0);
    });

    it('should calculate progress for middle sentence', () => {
      expect(calculateProgressFromIndex(5, 10)).toBe(5 / 9); // 0.555...
    });

    it('should calculate progress for last sentence', () => {
      expect(calculateProgressFromIndex(9, 10)).toBe(1);
    });

    it('should handle single sentence', () => {
      expect(calculateProgressFromIndex(0, 1)).toBe(0);
    });

    it('should clamp invalid indices', () => {
      expect(calculateProgressFromIndex(-1, 10)).toBe(0);
      expect(calculateProgressFromIndex(15, 10)).toBe(1);
    });
  });

  describe('validateSentenceIndex', () => {
    it('should clamp negative indices to 0', () => {
      expect(validateSentenceIndex(-1, 10)).toBe(0);
      expect(validateSentenceIndex(-5, 10)).toBe(0);
    });

    it('should clamp indices above max to max', () => {
      expect(validateSentenceIndex(10, 10)).toBe(9);
      expect(validateSentenceIndex(15, 10)).toBe(9);
    });

    it('should return valid indices unchanged', () => {
      expect(validateSentenceIndex(0, 10)).toBe(0);
      expect(validateSentenceIndex(5, 10)).toBe(5);
      expect(validateSentenceIndex(9, 10)).toBe(9);
    });

    it('should floor decimal indices', () => {
      expect(validateSentenceIndex(5.7, 10)).toBe(5);
      expect(validateSentenceIndex(5.2, 10)).toBe(5);
    });
  });
});
