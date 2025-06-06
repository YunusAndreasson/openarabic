import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '../../components/BaseCard';
import { ThemedText } from '../../components/ThemedText';
import { ANIMATION_TIMING } from '../../constants/animations';
import { LAYOUT , MIN_TOUCH_TARGET } from '../../constants/layout';
import { useButtonAction } from '../../hooks/useButtonAction';
import { useColors } from '../../hooks/useColors';
import type { AudioControlPanelProps } from '../../types/ui/audio.types';

 
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
        <Animated.View pointerEvents="none" style={containerStyle}>
          <View style={styles.hiddenPlaceholder} />
        </Animated.View>
      );
    }

    return (
      <Animated.View style={containerStyle}>
        <BaseCard
          shadowSize="medium"
          style={[
            styles.card,
            {
              backgroundColor: colors.audioControlBg,
              borderColor: colors.audioControlBorder,
              borderWidth: 1,
              shadowColor: colors.audioControlShadow,
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <TouchableOpacity
              accessibilityLabel="Previous sentence"
              accessibilityRole="button"
              accessibilityState={{ disabled: isFirstSentence }}
              disabled={isFirstSentence}
              style={styles.iconButton}
              accessibilityHint={
                isFirstSentence ? 'Already at first sentence' : 'Go to previous sentence'
              }
              onPress={handlePrevious}
            >
              <Ionicons
                color={isFirstSentence ? colors.disabled : colors.text}
                name="play-skip-back"
                size={24}
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
              accessibilityRole="button"
              accessibilityHint={
                isPlaying ? 'Pause the current sentence' : 'Start playing the current sentence'
              }
              style={[
                styles.playButton,
                {
                  backgroundColor: colors.elevation2 || colors.elevation1,
                },
              ]}
              onPress={handlePlayPause}
            >
              <Ionicons color={colors.text} name={isPlaying ? 'pause' : 'play'} size={28} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Next sentence"
              accessibilityRole="button"
              accessibilityState={{ disabled: isLastSentence }}
              disabled={isLastSentence}
              style={styles.iconButton}
              accessibilityHint={
                isLastSentence ? 'Already at last sentence' : 'Go to next sentence'
              }
              onPress={handleNext}
            >
              <Ionicons
                color={isLastSentence ? colors.disabled : colors.text}
                name="play-skip-forward"
                size={24}
              />
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <ThemedText style={styles.sentenceInfo} type="caption">
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
    left: LAYOUT.SPACING.LARGE,
    position: 'absolute',
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.SIZE,
    minWidth: MIN_TOUCH_TARGET.SIZE,
    padding: LAYOUT.SPACING.SMALL,
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
