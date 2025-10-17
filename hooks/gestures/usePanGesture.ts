'use no memo';
import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';

export interface PanGestureOptions {
  onBegin?: () => void;
  onUpdate: (progress: number) => void;
  onEnd?: () => void;
  enabled?: boolean;
  testId?: string;
  springConfig?: { damping: number; stiffness: number };
  trackWidth?: any; // SharedValue for track width
}

export interface PanGestureResult {
  gesture: any;
  isDragging: any;
  showTooltip: any;
  lastIndex: any;
}

/**
 * Custom hook for pan gestures with v2 optimizations
 * Optimized for scrubber-like interactions
 */
export const usePanGesture = (options: PanGestureOptions): PanGestureResult => {
  const {
    onBegin,
    onUpdate,
    onEnd,
    enabled = true,
    testId,
    springConfig = { damping: 15, stiffness: 300 },
    trackWidth,
  } = options;

  const isDragging = useSharedValue(false);
  const showTooltip = useSharedValue(0);
  const lastIndex = useSharedValue(-1);

  // Optimized pan gesture with better performance
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .onBegin(() => {
          'worklet';
          isDragging.value = true;
          showTooltip.value = withSpring(1, springConfig);
          if (onBegin) {
            runOnJS(onBegin)();
          }
        })
        .onUpdate(event => {
          'worklet';
          if (trackWidth && trackWidth.value > 0 && event.x >= 0) {
            // Calculate progress based on track width
            const progress = Math.max(0, Math.min(1, event.x / trackWidth.value));

            // Only call onUpdate if values are valid
            if (progress >= 0 && progress <= 1) {
              onUpdate(progress);
            }
          }
        })
        .onEnd(() => {
          'worklet';
          isDragging.value = false;
          showTooltip.value = withSpring(0, springConfig);
          if (onEnd) {
            runOnJS(onEnd)();
          }
        })
        .withTestId(testId || 'pan-gesture'),
    [enabled, onBegin, onUpdate, onEnd, testId, springConfig, isDragging, showTooltip, trackWidth]
  );

  return {
    gesture,
    isDragging,
    showTooltip,
    lastIndex,
  };
};
