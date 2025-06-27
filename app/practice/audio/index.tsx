import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompletionScreen, ListenHeader } from '@/components/listen';
import RepeatButton from '@/components/listen/RepeatButton';
import { WordDisplay } from '@/components/review';
import { DEFAULT_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAudioPracticeSession } from '@/hooks/practice';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useWordSizing } from '@/hooks/vocabulary/useWordSizing';
import { handleError } from '@/utils/errorHandling';

/**
 * Screen that plays Arabic words followed by their English translations
 * with visual indication of which language is currently being spoken
 */
const fontConfig = {
  minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
  maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
  // Removed hardcoded screen constraints for better responsiveness across all device sizes
};

export default function ListenScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromRemember = params['fromRemember'] === 'true';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // State
  const [_isClosing, setIsClosing] = useState(false);

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
    duration: DEFAULT_ANIMATION_DURATION,
    autoStart: true,
  });

  // Trigger word fade animations when the current word changes
  useEffect(() => {
    fadeOut();
    const t = setTimeout(() => fadeIn(), DEFAULT_ANIMATION_DURATION);
    return () => clearTimeout(t);
  }, [currentArabicWord, fadeIn, fadeOut]);

  // Close and cleanup
  const handleClose = useCallback(() => {
    setIsClosing(true);

    stopPlayback().catch(() => {});

    // Defer query invalidation until after navigation animation completes
    InteractionManager.runAfterInteractions(() => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
      }
    });

    // For non-completion scenarios, navigate away immediately
    try {
      // For user-initiated cancellations during session
      if (fromRemember) {
        // Use replace instead of navigate to avoid navigation stack issues
        router.replace(ROUTE_PATHS.PRACTICE_TAB);
      } else {
        router.back();
      }
    } catch (error) {
      // Fallback - if navigation fails, forcefully go back
      handleError(error instanceof Error ? error : new Error(String(error)));
      router.back();
    }
  }, [user?.id, queryClient, fromRemember, router, stopPlayback]);

  // Word sizing configuration for responsive text
  const wordFontSize = useWordSizing(currentArabicWord, fontConfig);

  if (isComplete) {
    return (
      <CompletionScreen
        title={STRINGS.SESSION_COMPLETE}
        subtitle={STRINGS.ALL_WORDS_PRACTICED}
        onClose={handleClose}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: insets.top + LAYOUT.SPACING.MEDIUM,
            paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
          },
        ]}
      >
        <ListenHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
        />

        <View style={styles.wordArea}>
          <Animated.View style={[styles.wordContainer, animatedStyle]}>
            <WordDisplay
              word={currentArabicWord}
              fontSize={wordFontSize}
              translation={translationToShow}
            />
          </Animated.View>
        </View>

        <View style={styles.bottomControls}>
          <RepeatButton enabled={repeatEnabled} onToggle={handleRepeatToggle} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,

  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  } as ViewStyle,

  wordArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
  } as ViewStyle,

  wordContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  } as ViewStyle,

  bottomControls: {
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.LARGE,
  } as ViewStyle,
});
