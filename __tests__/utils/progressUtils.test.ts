import {
  calculateDisplayProgress,
  PROGRESS_CONSTANTS,
  shouldTriggerAnimation,
} from '@/utils/progressUtils';

describe('Progress Utilities', () => {
  describe('PROGRESS_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(PROGRESS_CONSTANTS.MIN_PROGRESS_VALUE).toBe(0.1);
    });
  });

  describe('calculateDisplayProgress', () => {
    it('should return the maximum of progress and maxProgress', () => {
      const result = calculateDisplayProgress(50, 75);
      expect(result).toBe(75);
    });

    it('should return current progress when it is higher than maxProgress', () => {
      const result = calculateDisplayProgress(80, 60);
      expect(result).toBe(80);
    });

    it('should return the same value when progress equals maxProgress', () => {
      const result = calculateDisplayProgress(50, 50);
      expect(result).toBe(50);
    });
  });

  describe('shouldTriggerAnimation', () => {
    it('should return true when animation key is greater than minimum value', () => {
      const result = shouldTriggerAnimation(5);
      expect(result).toBe(true);
    });

    it('should return false when animation key is less than or equal to minimum value', () => {
      const result = shouldTriggerAnimation(0.05);
      expect(result).toBe(false);
    });

    it('should use custom minimum value when provided', () => {
      const result = shouldTriggerAnimation(3, 5);
      expect(result).toBe(false);
    });
  });
});
