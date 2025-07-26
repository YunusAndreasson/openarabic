import {
  PROGRESS_CONSTANTS,
  calculateDisplayProgress,
  shouldTriggerAnimation,
} from '@/utils/progressUtils';

describe('progressUtils', () => {
  describe('PROGRESS_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(PROGRESS_CONSTANTS.MIN_PROGRESS_VALUE).toBe(1);
    });
  });

  describe('calculateDisplayProgress', () => {
    it('should return maxProgress when progress is less than maxProgress', () => {
      const result = calculateDisplayProgress(5, 10);
      expect(result).toBe(10);
    });

    it('should return progress when progress is greater than maxProgress', () => {
      const result = calculateDisplayProgress(15, 10);
      expect(result).toBe(15);
    });

    it('should return progress when progress equals maxProgress', () => {
      const result = calculateDisplayProgress(10, 10);
      expect(result).toBe(10);
    });
  });

  describe('shouldTriggerAnimation', () => {
    it('should trigger animation when animationKey is greater than minValue', () => {
      const result = shouldTriggerAnimation(2);
      expect(result).toBe(true);
    });

    it('should not trigger animation when animationKey equals minValue', () => {
      const result = shouldTriggerAnimation(1);
      expect(result).toBe(false);
    });

    it('should not trigger animation when animationKey is less than minValue', () => {
      const result = shouldTriggerAnimation(0.5);
      expect(result).toBe(false);
    });
  });
});
