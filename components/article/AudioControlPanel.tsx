import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import BaseCard from '../../components/BaseCard';
import { ThemedText } from '../../components/ThemedText';
import { ANIMATION_TIMING } from '../../constants/animations';
import { LAYOUT } from '../../constants/layout';
import { useButtonAction } from '../../hooks/useButtonAction';
import { useColors } from '../../hooks/useColors';
import type { AudioControlPanelProps } from '../../types/ui/audio.types';

/* eslint-disable react/prop-types */
const AudioControlPanel = memo<AudioControlPanelProps>(
  ({
    isVisible,
    isPlaying,
    onPlayPause,
    onStop,
    onPrevious,
    onNext,
    currentSentenceIndex,
    totalSentences,
  }) => {
    const colors = useColors();

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
    const handleStop = useButtonAction(onStop, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handlePrevious = useButtonAction(onPrevious, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handleNext = useButtonAction(onNext, ANIMATION_TIMING.DEBOUNCE.STANDARD);

    // Memoize button states for better performance
    const isFirstSentence = useMemo(() => currentSentenceIndex === 0, [currentSentenceIndex]);
    const isLastSentence = useMemo(
      () => currentSentenceIndex === totalSentences - 1,
      [currentSentenceIndex, totalSentences]
    );

    // Early return with invisible container to maintain layout
    if (!isVisible) {
      return (
        <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
          <View style={styles.hiddenPlaceholder} />
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
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
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handlePrevious}
                disabled={isFirstSentence}
              >
                <Ionicons
                  name="play-skip-back"
                  size={24}
                  color={isFirstSentence ? colors.disabled : colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleNext}
                disabled={isLastSentence}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={24}
                  color={isLastSentence ? colors.disabled : colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.infoContainer}>
              <ThemedText type="caption" style={styles.sentenceInfo}>
                Sentence {currentSentenceIndex !== null ? currentSentenceIndex + 1 : 0}/
                {totalSentences}
              </ThemedText>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={handleStop}>
              <Ionicons name="close-circle" size={24} color={colors.text} />
            </TouchableOpacity>
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
  closeButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
  container: {
    bottom: LAYOUT.SPACING.LARGE,
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
  controlsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 3,
    justifyContent: 'flex-start',
  },
  hiddenPlaceholder: {
    height: 1,
    opacity: 0,
  },
  iconButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
  infoContainer: {
    alignItems: 'center',
    flex: 2,
  },
  playButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BUTTON.HEIGHT.MEDIUM / 2,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    justifyContent: 'center',
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  sentenceInfo: {
    textAlign: 'center',
  },
});

AudioControlPanel.displayName = 'AudioControlPanel';

export default AudioControlPanel;
