import React, { useCallback, useEffect, useRef } from 'react';
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
import { SPRING_CONFIG } from '@/constants/animation';
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
const HANDLE_SIZE = 24; // Fixed size for cleaner appearance
const TRACK_HEIGHT = 6; // Fixed height for simpler visuals
const DEFAULT_TRACK_WIDTH = SCRUBBER_CONSTANTS.DEFAULT_TRACK_WIDTH;

export function SentenceScrubber({ currentSentence, totalSentences, onSentenceChange, onScrubStart, onScrubEnd }: SentenceScrubberProps) {
  const colors = useColors();
  const lastSentenceRef = useRef(currentSentence);

    // Shared values for performance
    const trackWidth = useSharedValue(DEFAULT_TRACK_WIDTH as number);
    const handlePosition = useSharedValue(0);
    const lastIndex = useSharedValue(currentSentence);

    // React Compiler auto-memoizes
    const isValidScrubber = totalSentences > 1;
    const maxSentenceIndex = totalSentences - 1;

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
          if (trackWidth.get() > 0) {
            // Update handle position immediately for responsive feel
            handlePosition.set(progress * (trackWidth.get() - HANDLE_SIZE));

            // Calculate sentence index efficiently
            const sentenceIndex = Math.round(progress * maxSentenceIndex);
            // Only bridge to JS when the index actually changes
            if (sentenceIndex !== lastIndex.get()) {
              lastIndex.set(sentenceIndex);
              runOnJS(onSentenceChange)(sentenceIndex);
            }
          }
        },
        [trackWidth, handlePosition, maxSentenceIndex, lastIndex, onSentenceChange]
      ),
      onEnd: onScrubEnd,
      testId: 'sentence-scrubber-gesture',
      springConfig: SPRING_CONFIG.SCRUBBER,
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

        // Check if this is a scroll-driven update (sentence changed without user scrubbing)
        const isScrollDriven = Math.abs(currentSentence - lastSentenceRef.current) === 1;

        if (isScrollDriven) {
          // Instant update for scroll-driven changes (responsive feel, no lag)
          handlePosition.value = newPosition;
        } else {
          // Gentle spring for manual scrub or jumps (smooth feel)
          handlePosition.value = withSpring(newPosition, SPRING_CONFIG.SCRUBBER);
        }

        // Update ref when position changes externally (not from scrubbing)
        lastSentenceRef.current = currentSentence;
        // Sync lastIndex shared value to prevent redundant runOnJS on next drag
        lastIndex.value = currentSentence;
      }
    }, [currentSentence, maxSentenceIndex, isValidScrubber, isDragging, trackWidth, handlePosition, lastIndex]);

    // React Compiler auto-memoizes
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

    // Simplified handleStyle - fixed size, position only
    const handleStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: handlePosition.get() }],
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        top: -(HANDLE_SIZE - TRACK_HEIGHT) / 2,
      };
    }, [handlePosition]);

    // Simplified tooltip - opacity only, no scale animation
    const tooltipStyle = useAnimatedStyle(
      () => ({
        opacity: showTooltip.get(),
        transform: [
          { translateX: handlePosition.get() - LAYOUT.SPACING.XXXLARGE }, // Center tooltip
          { translateY: -30 }, // Position higher above the thumb for better visibility
        ],
      }),
      [showTooltip, handlePosition]
    );

    // Simplified track style - fixed height, subtle opacity change only
    const trackStyle = useAnimatedStyle(() => {
      return {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: colors.secondaryText,
        opacity: isDragging.get() ? LAYOUT.OPACITY.HIGH : LAYOUT.OPACITY.MEDIUM,
      };
    }, [isDragging, colors.secondaryText]);

    // React Compiler auto-memoizes
    const tooltipBubbleStyle = [styles.tooltipBubble, { backgroundColor: colors.wordTooltipBg }];

    const tooltipTextStyle = [styles.tooltipText, { color: colors.wordTooltipText }];

    const handleColorStyle = {
      backgroundColor: colors.tint,
    };

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
