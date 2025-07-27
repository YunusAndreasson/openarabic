import {
  calculateMaxTranslation,
  calculateSwipeThreshold,
  clampTranslation,
  GESTURE_CONSTANTS,
  getMaxTranslation,
  getSwipeAction,
  getSwipeDirection,
  getSwipeThreshold,
  isSwipeThresholdMet,
  SCRUBBER_CONSTANTS,
} from '@/utils/gestureUtils';

describe('Gesture Utilities', () => {
  describe('SCRUBBER_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(SCRUBBER_CONSTANTS.HANDLE_SIZE).toBe(20);
      expect(SCRUBBER_CONSTANTS.HANDLE_SIZE_ACTIVE).toBe(28);
      expect(SCRUBBER_CONSTANTS.TRACK_HEIGHT).toBe(4);
      expect(SCRUBBER_CONSTANTS.TRACK_HEIGHT_ACTIVE).toBe(12);
      expect(SCRUBBER_CONSTANTS.DEFAULT_TRACK_WIDTH).toBe(300);
    });
  });

  describe('GESTURE_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO).toBe(0.04);
      expect(GESTURE_CONSTANTS.RESET_DELAY).toBe(50);
      expect(GESTURE_CONSTANTS.MIN_DISTANCE).toBe(0.1);
    });
  });

  describe('getSwipeThreshold', () => {
    it('should calculate swipe threshold correctly', () => {
      const result = getSwipeThreshold();
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('getMaxTranslation', () => {
    it('should calculate max translation correctly', () => {
      const result = getMaxTranslation();
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateSwipeThreshold', () => {
    it('should calculate swipe threshold with custom screen width', () => {
      const result = calculateSwipeThreshold(400, 0.05);
      expect(result).toBe(20); // 400 * 0.05
    });
  });

  describe('calculateMaxTranslation', () => {
    it('should calculate max translation with custom screen width', () => {
      const result = calculateMaxTranslation(400, 0.1);
      expect(result).toBe(40); // 400 * 0.1
    });
  });

  describe('clampTranslation', () => {
    it('should clamp translation to max value', () => {
      const maxTranslation = 100;
      const result = clampTranslation(150, maxTranslation);
      expect(result).toBe(100);
    });

    it('should clamp translation to negative max value', () => {
      const maxTranslation = 100;
      const result = clampTranslation(-150, maxTranslation);
      expect(result).toBe(-100);
    });

    it('should return translation within bounds unchanged', () => {
      const maxTranslation = 100;
      const result = clampTranslation(50, maxTranslation);
      expect(result).toBe(50);
    });
  });

  describe('isSwipeThresholdMet', () => {
    it('should return true when translation exceeds threshold', () => {
      const threshold = 10;
      const result = isSwipeThresholdMet(15, threshold);
      expect(result).toBe(true);
    });

    it('should return false when translation is below threshold', () => {
      const threshold = 10;
      const result = isSwipeThresholdMet(5, threshold);
      expect(result).toBe(false);
    });
  });

  describe('getSwipeDirection', () => {
    it('should return right for positive translation', () => {
      const result = getSwipeDirection(10);
      expect(result).toBe('right');
    });

    it('should return left for negative translation', () => {
      const result = getSwipeDirection(-10);
      expect(result).toBe('left');
    });
  });

  describe('getSwipeAction', () => {
    it('should return swipe direction when threshold is met', () => {
      const threshold = 10;
      const result = getSwipeAction(15, threshold);
      expect(result).toBe('right');
    });

    it('should return null when threshold is not met', () => {
      const threshold = 10;
      const result = getSwipeAction(5, threshold);
      expect(result).toBe(null);
    });
  });
});
