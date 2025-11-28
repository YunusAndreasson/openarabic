/**
 * Tutorial: Tap card to reveal hint (Vague)
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
import { useColors } from '@/hooks/theme/useColors';

export function TutorialUnsureStep() {
  const colors = useColors();
  const progress = useSharedValue(0);
  const handScale = useSharedValue(1);

  useEffect(() => {
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

  const translationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], 'clamp'),
  }));

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ scale: handScale.value }],
  }));

  return (
    <View style={styles.container}>
      <ThemedText type="caption" style={[styles.title, { color: colors.secondaryText }]}>
        {STRINGS.TUTORIAL_VAGUE_TITLE}
      </ThemedText>

      <View style={[styles.wordCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText style={[styles.arabicWord, { color: colors.text }]}>
          {STRINGS.TUTORIAL_SAMPLE_WORD_ARABIC}
        </ThemedText>
        <Animated.View style={translationStyle}>
          <ThemedText type="caption" style={{ color: colors.secondaryText }}>
            {STRINGS.TUTORIAL_SAMPLE_WORD_HINT}
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View style={[styles.handContainer, handStyle]}>
        <Ionicons name="hand-left-outline" size={40} color={colors.tint} />
      </Animated.View>

      {/* Swipe options after peeking - matches Step 1 layout */}
      <View style={styles.swipeRow}>
        <View style={styles.swipeIndicator}>
          <View style={[styles.indicator, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="chevron-back" size={20} color={colors.error} />
          </View>
          <ThemedText type="caption" weight="semibold" style={{ color: colors.error }}>
            {STRINGS.TUTORIAL_SWIPE_DONT_KNOW}
          </ThemedText>
        </View>

        <View style={styles.swipeIndicator}>
          <View style={[styles.indicator, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="help-circle" size={20} color={colors.warning} />
          </View>
          <ThemedText type="caption" weight="semibold" style={{ color: colors.warning }}>
            {STRINGS.TUTORIAL_VAGUE}
          </ThemedText>
        </View>

        <View style={styles.swipeIndicator}>
          <View style={[styles.indicator, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="chevron-forward" size={20} color={colors.success} />
          </View>
          <ThemedText type="caption" weight="semibold" style={{ color: colors.success }}>
            {STRINGS.TUTORIAL_SWIPE_KNOW}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

TutorialUnsureStep.displayName = 'TutorialUnsureStep';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  wordCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  arabicWord: {
    fontSize: 28,
    lineHeight: 48,
    fontFamily: 'Amiri',
    textAlign: 'center',
  },
  handContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  swipeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  swipeIndicator: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    flex: 1,
  },
  indicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
