'use no memo';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePanGesture } from '@/hooks/gestures/usePanGesture';
import { useColors } from '@/hooks/theme/useColors';
import { SCRUBBER_CONSTANTS } from '@/utils/gestureUtils';

interface SentenceScrubberProps {
  currentSentence: number;
  totalSentences: number;
  onSentenceChange: (sentenceIndex: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

// Constants for better performance - Updated for Jakob's Law compliance
const HANDLE_SIZE = SCRUBBER_CONSTANTS.HANDLE_SIZE;
const HANDLE_SIZE_ACTIVE = SCRUBBER_CONSTANTS.HANDLE_SIZE_ACTIVE;
const TRACK_HEIGHT = SCRUBBER_CONSTANTS.TRACK_HEIGHT;
const TRACK_HEIGHT_ACTIVE = SCRUBBER_CONSTANTS.TRACK_HEIGHT_ACTIVE;
const DEFAULT_TRACK_WIDTH = SCRUBBER_CONSTANTS.DEFAULT_TRACK_WIDTH;
const SPRING_CONFIG = { damping: 20, stiffness: 400 };
const TOOLTIP_SPRING_CONFIG = { damping: 15, stiffness: 300 };

export const SentenceScrubber = React.memo<SentenceScrubberProps>(
  ({ currentSentence, totalSentences, onSentenceChange, onScrubStart, onScrubEnd }) => {
    const colors = useColors();
    const lastSentenceRef = useRef(currentSentence);

    // Shared values for performance
    const trackWidth = useSharedValue(DEFAULT_TRACK_WIDTH as number);
    const handlePosition = useSharedValue(0);
    const lastIndex = useSharedValue(currentSentence);

    // Memoized calculations to prevent unnecessary recalculations
    const isValidScrubber = useMemo(() => totalSentences > 1, [totalSentences]);
    const maxSentenceIndex = useMemo(() => totalSentences - 1, [totalSentences]);

    // ===== PAN GESTURE HOOK (v2 OPTIMIZED) =====
    const {
      gesture: panGesture,
      isDragging,
      showTooltip,
    } = usePanGesture({
      onBegin: onScrubStart,
      onUpdate: useCallback(
        (progress: number) => {
          'worklet';
          if (trackWidth.value > 0) {
            // Update handle position immediately for responsive feel
            handlePosition.value = progress * (trackWidth.value - HANDLE_SIZE);

            // Calculate sentence index efficiently
            const sentenceIndex = Math.round(progress * maxSentenceIndex);
            // Only bridge to JS when the index actually changes
            if (sentenceIndex !== lastIndex.value) {
              lastIndex.value = sentenceIndex;
              runOnJS(onSentenceChange)(sentenceIndex);
            }
          }
        },
        [trackWidth, handlePosition, maxSentenceIndex, lastIndex, onSentenceChange]
      ),
      onEnd: onScrubEnd,
      testId: 'sentence-scrubber-gesture',
      springConfig: TOOLTIP_SPRING_CONFIG,
      trackWidth,
    });

    // Cleanup all animations on unmount
    useEffect(() => {
      return () => {
        try {
          cancelAnimation(trackWidth);
          cancelAnimation(handlePosition);
          cancelAnimation(lastIndex);
          // Reset to default values
          trackWidth.value = DEFAULT_TRACK_WIDTH;
          handlePosition.value = 0;
          lastIndex.value = 0;
        } catch {
          // Animation cleanup failed - continue
        }
      };
    }, [trackWidth, handlePosition, lastIndex]);

    // Haptic feedback is now handled in the gesture hook

    // Update position when sentence changes (only when not dragging)
    React.useEffect(() => {
      if (!isDragging.value && trackWidth.value > 0 && isValidScrubber) {
        const progress = currentSentence / maxSentenceIndex;
        const newPosition = progress * (trackWidth.value - HANDLE_SIZE);
        handlePosition.value = withSpring(newPosition, SPRING_CONFIG);

        // Update ref when position changes externally (not from scrubbing)
        lastSentenceRef.current = currentSentence;
        // Sync lastIndex shared value to prevent redundant runOnJS on next drag
        lastIndex.value = currentSentence;
      }
    }, [currentSentence, maxSentenceIndex, isValidScrubber, isDragging, trackWidth]);

    // Memoized track layout handler
    const onLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== trackWidth.value) {
          trackWidth.value = width;

          // Update position with new width immediately
          if (isValidScrubber) {
            const progress = currentSentence / maxSentenceIndex;
            const position = progress * (width - HANDLE_SIZE);
            handlePosition.value = position;
          }
        }
      },
      [currentSentence, maxSentenceIndex, isValidScrubber]
    );

    // Gesture is now handled by the usePanGesture hook

    // Memoized animated styles for better performance - Updated for dynamic sizing
    const handleStyle = useAnimatedStyle(() => {
      const size = isDragging.value ? HANDLE_SIZE_ACTIVE : HANDLE_SIZE;
      const offset = (size - HANDLE_SIZE) / 2; // Adjust position to keep centered

      return {
        transform: [{ translateX: handlePosition.value - offset }],
        width: size,
        height: size,
        borderRadius: size / 2,
        top: -(size - (isDragging.value ? TRACK_HEIGHT_ACTIVE : TRACK_HEIGHT)) / 2,
      };
    }, [handlePosition, isDragging]);

    // Updated tooltip positioning - ABOVE the thumb (Jakob's Law)
    const tooltipStyle = useAnimatedStyle(
      () => ({
        opacity: showTooltip.value,
        transform: [
          { translateX: handlePosition.value - LAYOUT.SPACING.XXXLARGE }, // Center tooltip
          { translateY: -30 }, // Position higher above the thumb for better visibility and prevent clipping
          { scale: withSpring(showTooltip.value > 0 ? 1 : 0.8, TOOLTIP_SPRING_CONFIG) },
        ],
      }),
      [showTooltip, handlePosition]
    );

    // Dynamic track style for better visibility during interaction
    const trackStyle = useAnimatedStyle(() => {
      const height = isDragging.value ? TRACK_HEIGHT_ACTIVE : TRACK_HEIGHT;
      return {
        height,
        borderRadius: height / 2,
        backgroundColor: colors.secondaryText, // Use secondaryText for better visibility across themes
        opacity: isDragging.value ? LAYOUT.OPACITY.HOVER : LAYOUT.OPACITY.MEDIUM, // Higher opacity for better visibility
      };
    }, [isDragging, colors.secondaryText]);

    // Memoized styles for static elements
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
        {/* Tooltip positioned ABOVE thumb (Jakob's Law) */}
        <Animated.View style={[styles.tooltip, tooltipStyle]}>
          <View style={tooltipBubbleStyle}>
            <ThemedText type="caption" style={tooltipTextStyle}>
              {currentSentence + 1} / {totalSentences}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Track with dynamic sizing and visibility */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.trackContainer}>
            <Animated.View style={trackStyle} onLayout={onLayout}>
              {/* Handle with dynamic sizing */}
              <Animated.View style={[styles.handle, handleColorStyle, handleStyle]} />
            </Animated.View>
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
    height: MIN_TOUCH_TARGET.LARGE + LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  tooltip: {
    position: 'absolute',
    bottom: LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.XXLARGE, // Positioned higher above the track (24px + 32px = 56px)
    width: MIN_TOUCH_TARGET.LARGE + LAYOUT.SPACING.XXXLARGE,
    alignItems: 'center',
  },
  tooltipBubble: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
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
    height: MIN_TOUCH_TARGET.SMALL + LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
  },
  handle: {
    position: 'absolute',
    backgroundColor: 'transparent', // Will be set by animated style
    ...LAYOUT.ELEVATION.SMALL,
  },
});
