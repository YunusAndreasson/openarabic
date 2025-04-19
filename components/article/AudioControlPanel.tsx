import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimateStyle } from 'react-native-reanimated';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { ANIMATION_TIMING } from '@/constants/animations';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useButtonAction } from '@/hooks/useButtonAction';
import { useColors } from '@/hooks/useColors';

interface AudioControlPanelProps {
  isVisible: boolean;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  currentSentenceIndex: number | null;
  totalSentences: number;
}

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

    const { animatedStyle, fadeIn, fadeOut } = useOpacityAnimation({
      initialOpacity: 0,
      duration: 250,
    });

    const hiddenStyle = useMemo(
      () => ({
        ...styles.container,
        opacity: 0,
      }),
      []
    ) as AnimateStyle<ViewStyle>;

    useEffect(() => {
      if (isVisible) {
        fadeIn();
      } else {
        fadeOut();
      }
    }, [isVisible, fadeIn, fadeOut]);

    const handlePlayPause = useButtonAction(onPlayPause, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handleStop = useButtonAction(onStop, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handlePrevious = useButtonAction(onPrevious, ANIMATION_TIMING.DEBOUNCE.STANDARD);
    const handleNext = useButtonAction(onNext, ANIMATION_TIMING.DEBOUNCE.STANDARD);

    if (!isVisible) {
      return <Animated.View style={hiddenStyle} pointerEvents="none" />;
    }

    const isFirstSentence = currentSentenceIndex === 0;
    const isLastSentence = currentSentenceIndex === totalSentences - 1;

    return (
      <Animated.View style={[styles.container, animatedStyle as AnimateStyle<ViewStyle>]}>
        <BaseCard style={[styles.card, { backgroundColor: colors.elevation2 }]} shadowSize="medium">
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
                  color={isFirstSentence ? colors.textTertiary : colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.card }]}
                onPress={handlePlayPause}
              >
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
                  color={isLastSentence ? colors.textTertiary : colors.text}
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
  iconButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
  infoContainer: {
    alignItems: 'center',
    flex: 2,
  },
  playButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    width: 44,
  },
  sentenceInfo: {
    textAlign: 'center',
  },
});

AudioControlPanel.displayName = 'AudioControlPanel';

export default AudioControlPanel;
