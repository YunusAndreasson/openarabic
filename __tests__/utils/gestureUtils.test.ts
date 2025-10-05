import { LAYOUT } from '@/constants/layout';
import {
  GESTURE_CONFIG,
  GESTURE_CONSTANTS,
  GestureUtils,
  SCRUBBER_CONSTANTS,
} from '@/utils/gestureUtils';

describe('gestureUtils', () => {
  describe('GESTURE_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO).toBe(0.04);
      expect(GESTURE_CONSTANTS.RESET_DELAY).toBe(50);
      expect(GESTURE_CONSTANTS.MIN_DISTANCE).toBe(0.1);
      expect(GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO).toBe(LAYOUT.OPACITY.HOVER);
      expect(GESTURE_CONSTANTS.DEBOUNCE_DELAY).toBe(16);
      expect(GESTURE_CONSTANTS.HAPTIC_THRESHOLD).toBe(0.02);
    });
  });

  describe('SCRUBBER_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(SCRUBBER_CONSTANTS.HANDLE_SIZE).toBe(20);
      expect(SCRUBBER_CONSTANTS.HANDLE_SIZE_ACTIVE).toBe(28);
      expect(SCRUBBER_CONSTANTS.TRACK_HEIGHT).toBe(4);
      expect(SCRUBBER_CONSTANTS.TRACK_HEIGHT_ACTIVE).toBe(12);
      expect(SCRUBBER_CONSTANTS.DEFAULT_TRACK_WIDTH).toBe(300);
      expect(SCRUBBER_CONSTANTS.TOOLTIP_ANIMATION_DURATION).toBe(200);
      expect(SCRUBBER_CONSTANTS.POSITION_UPDATE_THRESHOLD).toBe(0.01);
    });
  });

  describe('GESTURE_CONFIG', () => {
    it('should have correct config values', () => {
      expect(GESTURE_CONFIG.MIN_DISTANCE).toBe(GESTURE_CONSTANTS.MIN_DISTANCE);
      expect(GESTURE_CONFIG.ACTIVE_OFFSET_X).toEqual([-1, 1]);
      expect(GESTURE_CONFIG.SIMULTANEOUS_GESTURES).toBe(true);
      expect(GESTURE_CONFIG.SHOULD_CANCEL_WHEN_OUTSIDE).toBe(true);
    });
  });

  describe('GestureUtils', () => {
    describe('getSwipeDirection', () => {
      it('should return "none" when translation is below threshold', () => {
        const result = GestureUtils.getSwipeDirection(5, 10);
        expect(result).toBe('none');
      });

      it('should return direction when translation is exactly at threshold', () => {
        const result = GestureUtils.getSwipeDirection(10, 10);
        expect(result).toBe('right');
      });

      it('should return "right" when translation is positive and above threshold', () => {
        const result = GestureUtils.getSwipeDirection(15, 10);
        expect(result).toBe('right');
      });

      it('should return "left" when translation is negative and above threshold', () => {
        const result = GestureUtils.getSwipeDirection(-15, 10);
        expect(result).toBe('left');
      });

      it('should return "none" when translation is zero', () => {
        const result = GestureUtils.getSwipeDirection(0, 10);
        expect(result).toBe('none');
      });

      it('should handle negative threshold (absolute value comparison)', () => {
        const result = GestureUtils.getSwipeDirection(-15, -10);
        expect(result).toBe('left');
      });

      it('should handle small positive translations', () => {
        const result = GestureUtils.getSwipeDirection(0.5, 0.3);
        expect(result).toBe('right');
      });

      it('should handle small negative translations', () => {
        const result = GestureUtils.getSwipeDirection(-0.5, 0.3);
        expect(result).toBe('left');
      });
    });

    describe('shouldEnableGesture', () => {
      it('should return true when both flags are false', () => {
        const result = GestureUtils.shouldEnableGesture(false, false);
        expect(result).toBe(true);
      });

      it('should return false when isUpdating is true', () => {
        const result = GestureUtils.shouldEnableGesture(true, false);
        expect(result).toBe(false);
      });

      it('should return false when isTransitioning is true', () => {
        const result = GestureUtils.shouldEnableGesture(false, true);
        expect(result).toBe(false);
      });

      it('should return false when both flags are true', () => {
        const result = GestureUtils.shouldEnableGesture(true, true);
        expect(result).toBe(false);
      });
    });

    describe('clampTranslation', () => {
      it('should return value when within bounds', () => {
        const result = GestureUtils.clampTranslation(50, 0, 100);
        expect(result).toBe(50);
      });

      it('should clamp to min when value is below min', () => {
        const result = GestureUtils.clampTranslation(-10, 0, 100);
        expect(result).toBe(0);
      });

      it('should clamp to max when value is above max', () => {
        const result = GestureUtils.clampTranslation(150, 0, 100);
        expect(result).toBe(100);
      });

      it('should return min when value equals min', () => {
        const result = GestureUtils.clampTranslation(0, 0, 100);
        expect(result).toBe(0);
      });

      it('should return max when value equals max', () => {
        const result = GestureUtils.clampTranslation(100, 0, 100);
        expect(result).toBe(100);
      });

      it('should handle negative bounds', () => {
        const result = GestureUtils.clampTranslation(-50, -100, 0);
        expect(result).toBe(-50);
      });

      it('should clamp negative value to negative min', () => {
        const result = GestureUtils.clampTranslation(-150, -100, 0);
        expect(result).toBe(-100);
      });

      it('should clamp positive value to negative max', () => {
        const result = GestureUtils.clampTranslation(10, -100, -50);
        expect(result).toBe(-50);
      });

      it('should handle decimal values', () => {
        const result = GestureUtils.clampTranslation(0.5, 0, 1);
        expect(result).toBe(0.5);
      });

      it('should clamp decimal value to bounds', () => {
        const result = GestureUtils.clampTranslation(1.5, 0, 1);
        expect(result).toBe(1);
      });
    });
  });
});
