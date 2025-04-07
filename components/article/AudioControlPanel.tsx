import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, memo, useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyleProp } from 'react-native-reanimated';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

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

const AudioControlPanel: React.FC<AudioControlPanelProps> = ({
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
  // Track button press states to prevent multiple rapid presses
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Use opacity animation hook with slower duration for smoother transitions
  const { animatedStyle, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 250, // Slightly longer duration for smoother appearance
  });

  // Create a memoized hidden style to avoid inline style issues
  const hiddenStyle = useMemo(
    () => ({
      ...styles.container,
      opacity: 0,
    }),
    []
  );

  // Handle visibility changes only when it actually changes
  useEffect(() => {
    if (isVisible) {
      fadeIn();
    } else {
      fadeOut();
    }
  }, [isVisible, fadeIn, fadeOut]);

  // Prevent multiple rapid button presses
  const handleButtonAction = useCallback(
    (action: () => void) => {
      if (isActionInProgress) return;

      // Set action in progress to prevent rapid clicks
      setIsActionInProgress(true);
      lightFeedback();

      // Perform the action
      action();

      // Reset after a short delay
      setTimeout(() => {
        setIsActionInProgress(false);
      }, 300);
    },
    [isActionInProgress]
  );

  const handlePlayPause = useCallback(() => {
    handleButtonAction(onPlayPause);
  }, [handleButtonAction, onPlayPause]);

  const handleStop = useCallback(() => {
    handleButtonAction(onStop);
  }, [handleButtonAction, onStop]);

  const handlePrevious = useCallback(() => {
    handleButtonAction(onPrevious);
  }, [handleButtonAction, onPrevious]);

  const handleNext = useCallback(() => {
    handleButtonAction(onNext);
  }, [handleButtonAction, onNext]);

  // Maintain component mounted but hidden when not visible
  // This prevents flash on reappearance
  if (!isVisible) {
    return (
      <Animated.View style={hiddenStyle as AnimatedStyleProp<ViewStyle>} pointerEvents="none" />
    );
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle as AnimatedStyleProp<ViewStyle>]}
      pointerEvents={isActionInProgress ? 'none' : 'auto'}
    >
      <BaseCard style={[styles.card, { backgroundColor: colors.elevation2 }]} shadowSize="medium">
        <View style={styles.contentContainer}>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handlePrevious}
              disabled={currentSentenceIndex === 0 || isActionInProgress}
            >
              <Ionicons
                name="play-skip-back"
                size={24}
                color={currentSentenceIndex === 0 ? colors.textTertiary : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playButton,
                { backgroundColor: colors.card },
                isActionInProgress && styles.buttonPressed,
              ]}
              onPress={handlePlayPause}
              disabled={isActionInProgress}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleNext}
              disabled={currentSentenceIndex === totalSentences - 1 || isActionInProgress}
            >
              <Ionicons
                name="play-skip-forward"
                size={24}
                color={
                  currentSentenceIndex === totalSentences - 1 ? colors.textTertiary : colors.text
                }
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <ThemedText type="caption" style={styles.sentenceInfo}>
              Sentence {currentSentenceIndex !== null ? currentSentenceIndex + 1 : 0}/
              {totalSentences}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleStop}
            disabled={isActionInProgress}
          >
            <Ionicons name="close-circle" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </BaseCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.8,
  },
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

export default memo(AudioControlPanel);
