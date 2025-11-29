/**
 * Contextual help: Tap for hint
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

export function TutorialHintStep() {
  const colors = useColors();
  const progress = useSharedValue(0);
  const handScale = useSharedValue(1);

  useEffect(() => {
    // Animate hint appearing
    progress.value = withRepeat(
      withSequence(
        withDelay(600, withTiming(0)),
        withTiming(1, { duration: 250 }),
        withDelay(800, withTiming(1)),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );

    // Animate hand tap
    handScale.value = withRepeat(
      withSequence(
        withDelay(600, withTiming(1)),
        withTiming(0.85, { duration: 100 }),
        withTiming(1, { duration: 100 }),
        withDelay(850, withTiming(1)),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [progress, handScale]);

  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], 'clamp'),
  }));

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ scale: handScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Description card with inline styled text */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText type="body" variant="secondary" style={styles.description}>
          {STRINGS.TUTORIAL_CONTEXT_HINT_LINE1}{' '}
          <ThemedText type="body" weight="bold">
            {STRINGS.TUTORIAL_CONTEXT_HINT_LINE2}
          </ThemedText>{' '}
          {STRINGS.TUTORIAL_CONTEXT_HINT_LINE3}
        </ThemedText>
      </View>

      {/* Word card with animated hint */}
      <View style={[styles.wordCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText style={[styles.arabicWord, { color: colors.text }]}>
          {STRINGS.TUTORIAL_SAMPLE_WORD_ARABIC}
        </ThemedText>
        <Animated.View style={hintStyle}>
          <ThemedText type="body" style={{ color: colors.warning }}>
            {STRINGS.TUTORIAL_SAMPLE_WORD_HINT}
          </ThemedText>
        </Animated.View>
      </View>

      {/* Animated hand tapping */}
      <Animated.View style={[styles.handContainer, handStyle]}>
        <Ionicons name="hand-left-outline" size={TUTORIAL_VISUALS.ICON_SIZE} color={colors.text} />
      </Animated.View>
    </View>
  );
}

TutorialHintStep.displayName = 'TutorialHintStep';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  description: {
    textAlign: 'center',
  },
  wordCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  arabicWord: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.ARABIC,
    fontFamily: 'Amiri',
    textAlign: 'center',
  },
  handContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
});
