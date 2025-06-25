import React, { useCallback, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface SentenceScrubberProps {
  currentSentence: number;
  totalSentences: number;
  onSentenceChange: (sentenceIndex: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

// Constants for better performance
const HANDLE_SIZE = 20;
const TRACK_HEIGHT = 4;
const DEFAULT_TRACK_WIDTH = 300;
const SPRING_CONFIG = { damping: 20, stiffness: 400 };
const TOOLTIP_SPRING_CONFIG = { damping: 15, stiffness: 300 };

export const SentenceScrubber = React.memo<SentenceScrubberProps>(
  ({ currentSentence, totalSentences, onSentenceChange, onScrubStart, onScrubEnd }) => {
    const colors = useColors();

    // Shared values for performance
    const trackWidth = useSharedValue(DEFAULT_TRACK_WIDTH);
    const handlePosition = useSharedValue(0);
    const showTooltip = useSharedValue(0);
    const isDragging = useSharedValue(false);

    // Memoized calculations to prevent unnecessary recalculations
    const isValidScrubber = useMemo(() => totalSentences > 1, [totalSentences]);

    const maxSentenceIndex = useMemo(() => totalSentences - 1, [totalSentences]);

    // Note: Removed currentProgress derived value since we're using direct calculation in useEffect

    // Memoized callback wrapper with throttling protection
    const safeSentenceChange = useCallback(
      (index: number) => {
        const safeIndex = Math.max(0, Math.min(Math.floor(index), maxSentenceIndex));
        onSentenceChange(safeIndex);
      },
      [maxSentenceIndex, onSentenceChange]
    );

    // Optimized position calculation
    const calculatePosition = useCallback((progress: number, width: number) => {
      'worklet';
      return progress * (width - HANDLE_SIZE);
    }, []);

    // Update position when sentence changes (only when not dragging)
    React.useEffect(() => {
      if (!isDragging.value && trackWidth.value > 0 && isValidScrubber) {
        const progress = currentSentence / maxSentenceIndex;
        const newPosition = calculatePosition(progress, trackWidth.value);
        handlePosition.value = withSpring(newPosition, SPRING_CONFIG);
      }
    }, [
      currentSentence,
      maxSentenceIndex,
      isValidScrubber,
      calculatePosition,
      isDragging,
      trackWidth,
    ]);

    // Memoized track layout handler
    const onLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== trackWidth.value) {
          trackWidth.value = width;

          // Update position with new width immediately
          if (isValidScrubber) {
            const progress = currentSentence / maxSentenceIndex;
            handlePosition.value = calculatePosition(progress, width);
          }
        }
      },
      [currentSentence, maxSentenceIndex, isValidScrubber, calculatePosition]
    );

    // Optimized pan gesture with better performance
    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .onBegin(() => {
            'worklet';
            isDragging.value = true;
            showTooltip.value = withSpring(1, TOOLTIP_SPRING_CONFIG);
            runOnJS(onScrubStart)();
          })
          .onUpdate(event => {
            'worklet';
            if (trackWidth.value > 0 && event.x >= 0) {
              // Clamp progress to valid range
              const progress = Math.max(0, Math.min(1, event.x / trackWidth.value));

              // Update handle position immediately for responsive feel
              handlePosition.value = calculatePosition(progress, trackWidth.value);

              // Calculate sentence index efficiently
              const sentenceIndex = Math.round(progress * maxSentenceIndex);
              runOnJS(safeSentenceChange)(sentenceIndex);
            }
          })
          .onEnd(() => {
            'worklet';
            isDragging.value = false;
            showTooltip.value = withSpring(0, TOOLTIP_SPRING_CONFIG);
            runOnJS(onScrubEnd)();
          })
          .withTestId('sentence-scrubber-gesture'),
      [trackWidth, handlePosition, maxSentenceIndex, safeSentenceChange, onScrubStart, onScrubEnd]
    );

    // Memoized animated styles for better performance
    const handleStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateX: handlePosition.value }],
      }),
      [handlePosition]
    );

    const tooltipStyle = useAnimatedStyle(
      () => ({
        opacity: showTooltip.value,
        transform: [
          { translateX: handlePosition.value - LAYOUT.SPACING.XXXLARGE }, // Center tooltip
          { scale: withSpring(showTooltip.value > 0 ? 1 : 0.8, TOOLTIP_SPRING_CONFIG) },
        ],
      }),
      [showTooltip, handlePosition]
    );

    // Memoized styles for static elements
    const trackStyle = useMemo(
      () => [styles.track, { backgroundColor: colors.progressBackground }],
      [colors.progressBackground]
    );

    const tooltipBubbleStyle = useMemo(
      () => [styles.tooltipBubble, { backgroundColor: colors.wordTooltipBg }],
      [colors.wordTooltipBg]
    );

    const tooltipTextStyle = useMemo(
      () => [styles.tooltipText, { color: colors.wordTooltipText }],
      [colors.wordTooltipText]
    );

    const handleColorStyle = useMemo(
      () => ({
        backgroundColor: colors.tint,
      }),
      [colors.tint]
    );

    // Early return for invalid state
    if (!isValidScrubber) return null;

    return (
      <View style={styles.container}>
        {/* Tooltip with memoized content */}
        <Animated.View style={[styles.tooltip, tooltipStyle]}>
          <View style={tooltipBubbleStyle}>
            <Text style={tooltipTextStyle}>
              {currentSentence + 1} / {totalSentences}
            </Text>
          </View>
        </Animated.View>

        {/* Track with optimized gesture handling */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.trackContainer}>
            <View style={trackStyle} onLayout={onLayout}>
              {/* Handle with memoized styles */}
              <Animated.View style={[styles.handle, handleColorStyle, handleStyle]} />
            </View>
          </View>
        </GestureDetector>
      </View>
    );
  }
);

SentenceScrubber.displayName = 'SentenceScrubber';

// Optimized styles object (created once)
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: LAYOUT.SPACING.XLARGE,
    left: LAYOUT.SPACING.XLARGE,
    right: LAYOUT.SPACING.XLARGE,
    height: LAYOUT.TOUCH_TARGET.LARGE + LAYOUT.SPACING.MEDIUM, // Responsive height
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  tooltip: {
    position: 'absolute',
    bottom: LAYOUT.SPACING.XLARGE - LAYOUT.SPACING.SMALL, // Responsive positioning
    width: LAYOUT.TOUCH_TARGET.LARGE + LAYOUT.SPACING.XXXLARGE, // Responsive width
    alignItems: 'center',
  },
  tooltipBubble: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: 6,
    ...LAYOUT.ELEVATION.SMALL,
  },
  tooltipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
  },
  trackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: LAYOUT.TOUCH_TARGET.SMALL + LAYOUT.SPACING.SMALL, // Responsive height
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'relative',
  },
  handle: {
    position: 'absolute',
    top: -(HANDLE_SIZE - TRACK_HEIGHT) / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    ...LAYOUT.ELEVATION.SMALL,
  },
});
