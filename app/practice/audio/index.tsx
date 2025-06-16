import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ListenHeader, CompletionScreen } from '@/components/listen';
import RepeatButton from '@/components/listen/RepeatButton';
import { WordDisplay } from '@/components/review';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAudioPracticeSession } from '@/hooks/practice';
import { useColors } from '@/hooks/theme/useColors';
import { useWordSizing } from '@/hooks/vocabulary/useWordSizing';
import { handleError } from '@/utils/errorHandling';

/**
 * Screen that plays Arabic words followed by their English translations
 * with visual indication of which language is currently being spoken
 */
const fontConfig = {
  minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
  maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
  minScreenWidth: 320,
  maxScreenWidth: 500,
};

export default function ListenScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromRemember = params['fromRemember'] === 'true';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // State
  const [isClosing, setIsClosing] = useState(false);

  const {
    currentArabicWord,
    translationToShow,
    progress,
    maxProgress,
    progressAnimationKey,
    repeatEnabled,
    isComplete,
    handleRepeatToggle,
    stopPlayback,
  } = useAudioPracticeSession();

  // Animation
  const { animatedStyle, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 200,
    autoStart: true,
  });

  // Trigger word fade animations when the current word changes
  useEffect(() => {
    fadeOut();
    const t = setTimeout(() => fadeIn(), 200);
    return () => clearTimeout(t);
  }, [currentArabicWord, fadeIn, fadeOut]);

  // Close and cleanup
  const handleClose = useCallback(() => {
    setIsClosing(true);

    stopPlayback().catch(() => {});

    // Invalidate relevant queries
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
    }

    // For non-completion scenarios, navigate away immediately
    try {
      // For user-initiated cancellations during session
      if (fromRemember) {
        // Use replace instead of navigate to avoid navigation stack issues
        router.replace('/(tabs)/practice');
      } else {
        router.back();
      }
    } catch (error) {
      // Fallback - if navigation fails, forcefully go back
      handleError(error instanceof Error ? error : new Error(String(error)));
      router.back();
    }
  }, [user?.id, queryClient, fromRemember, router, stopPlayback]);

  // Calculate font size based on word length
  const wordFontSize = useWordSizing(currentArabicWord, fontConfig);

  // Audio sessions don't show word management - removed hasCurrentWord and handleManageWord

  // Only show completion screen if we're not in the process of closing
  if (isComplete && !isClosing) {
    return (
      <CompletionScreen
        useThemedView
        buttonStyle={{ minWidth: 180 }}
        buttonText="Continue"
        buttonVariant="outlined"
        iconName="checkmark-circle-outline"
        iconSize={120}
        subtitle="All words practiced"
        title="Session Complete!"
        onClose={handleClose}
      />
    );
  }

  return (
    <ThemedView style={styles.container} useSafeArea={true}>
      <View style={styles.contentContainer}>
        <ListenHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          hasCurrentWord={false}
          onManageWord={undefined}
          onClose={handleClose}
        />

        <View style={styles.wordArea}>
          <Animated.View style={[styles.wordContainer, animatedStyle as ViewStyle]}>
            <WordDisplay
              fontSize={wordFontSize}
              translation={translationToShow}
              word={currentArabicWord}
            />
          </Animated.View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + LAYOUT.SPACING.SMALL }]}>
          <RepeatButton enabled={repeatEnabled} onToggle={handleRepeatToggle} />

          <View style={styles.noteContainer}>
            <Ionicons
              color={colors.tint}
              name="information-circle-outline"
              size={18}
              style={styles.noteIcon}
            />
            <ThemedText style={styles.noteText}>Works with screen off</ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 0,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  noteContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    opacity: LAYOUT.OPACITY.HOVER,
  },
  noteIcon: {
    fontWeight: '500',
    marginRight: LAYOUT.SPACING.TINY,
    opacity: LAYOUT.OPACITY.HOVER,
  },
  noteText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.HOVER,
  },
  wordArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
    position: 'relative',
    width: '100%',
  },
  wordContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
