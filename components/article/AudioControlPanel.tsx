import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '../../components/BaseCard';
import { ThemedText } from '../../components/ThemedText';
import { ANIMATION_TIMING } from '../../constants/animations';
import { LAYOUT } from '../../constants/layout';
import { MIN_TOUCH_TARGET } from '../../constants/layout';
import { useButtonAction } from '../../hooks/useButtonAction';
import { useColors } from '../../hooks/useColors';
import type { AudioControlPanelProps } from '../../types/ui/audio.types';

/* eslint-disable react/prop-types */
const AudioControlPanel = memo<AudioControlPanelProps>(
  ({
    isVisible,
    isPlaying,
    onPlayPause,
    onPrevious,
    onNext,
    currentSentenceIndex,
    totalSentences,
  }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // Calculate bottom padding that respects safe area and provides comfortable spacing
    const bottomPadding = useMemo(() => {
      return Math.max(insets.bottom, LAYOUT.SPACING.MEDIUM) + LAYOUT.SPACING.LARGE;
    }, [insets.bottom]);

    // Animated visibility style for smoother transitions
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: withTiming(isVisible ? 1 : 0, { duration: 300 }),
        transform: [
          {
            translateY: withTiming(isVisible ? 0 : 100, { duration: 300 }),
          },
        ],
      };
    }, [isVisible]);

    const handlePlayPause = useButtonAction(onPlayPause, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handlePrevious = useButtonAction(onPrevious, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handleNext = useButtonAction(onNext, ANIMATION_TIMING.DEBOUNCE.STANDARD);

    // Memoize button states for better performance
    const isFirstSentence = useMemo(() => currentSentenceIndex === 0, [currentSentenceIndex]);
    const isLastSentence = useMemo(
      () => currentSentenceIndex === totalSentences - 1,
      [currentSentenceIndex, totalSentences]
    );

    // Dynamic container style with proper safe area handling
    const containerStyle = useMemo(
      () => [styles.container, { bottom: bottomPadding }, animatedStyle],
      [bottomPadding, animatedStyle]
    );

    // Early return with invisible container to maintain layout
    if (!isVisible) {
      return (
        <Animated.View style={containerStyle} pointerEvents="none">
          <View style={styles.hiddenPlaceholder} />
        </Animated.View>
      );
    }

    return (
      <Animated.View style={containerStyle}>
        <BaseCard
          style={[
            styles.card,
            {
              backgroundColor: colors.audioControlBg,
              borderColor: colors.audioControlBorder,
              borderWidth: 1,
              shadowColor: colors.audioControlShadow,
            },
          ]}
          shadowSize="medium"
        >
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handlePrevious}
              disabled={isFirstSentence}
              accessibilityRole="button"
              accessibilityLabel="Previous sentence"
              accessibilityHint={
                isFirstSentence ? 'Already at first sentence' : 'Go to previous sentence'
              }
              accessibilityState={{ disabled: isFirstSentence }}
            >
              <Ionicons
                name="play-skip-back"
                size={24}
                color={isFirstSentence ? colors.disabled : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePlayPause}
              style={[
                styles.playButton,
                {
                  backgroundColor: colors.elevation2 || colors.elevation1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
              accessibilityHint={
                isPlaying ? 'Pause the current sentence' : 'Start playing the current sentence'
              }
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleNext}
              disabled={isLastSentence}
              accessibilityRole="button"
              accessibilityLabel="Next sentence"
              accessibilityHint={
                isLastSentence ? 'Already at last sentence' : 'Go to next sentence'
              }
              accessibilityState={{ disabled: isLastSentence }}
            >
              <Ionicons
                name="play-skip-forward"
                size={24}
                color={isLastSentence ? colors.disabled : colors.text}
              />
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <ThemedText type="caption" style={styles.sentenceInfo}>
                Sentence {currentSentenceIndex !== null ? currentSentenceIndex + 1 : 0}/
                {totalSentences}
              </ThemedText>
            </View>
          </View>
        </BaseCard>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
  },
  container: {
    position: 'absolute',
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  contentContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  hiddenPlaceholder: {
    height: 1,
    opacity: 0,
  },
  iconButton: {
    padding: LAYOUT.SPACING.SMALL,
    minWidth: MIN_TOUCH_TARGET.SIZE,
    minHeight: MIN_TOUCH_TARGET.SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    flex: 1,
    marginLeft: LAYOUT.SPACING.MEDIUM,
  },
  playButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BUTTON.HEIGHT.MEDIUM / 2,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    justifyContent: 'center',
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },
  sentenceInfo: {
    textAlign: 'center',
  },
});

AudioControlPanel.displayName = 'AudioControlPanel';

export default AudioControlPanel;
