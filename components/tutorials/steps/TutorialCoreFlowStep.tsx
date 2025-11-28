/**
 * Tutorial: Swipe left/right for Don't know/Know
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
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
import { TUTORIAL_ANIMATION } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

export function TutorialCoreFlowStep() {
  const colors = useColors();
  const handTranslateX = useSharedValue(0);

  useEffect(() => {
    handTranslateX.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(0)),
        withTiming(-70, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
        withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
        withDelay(600, withTiming(0)),
        withTiming(70, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
        withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
        withDelay(600, withTiming(0)),
      ),
      -1,
      false,
    );
  }, [handTranslateX]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handTranslateX.value }],
  }));

  return (
    <View style={styles.container}>
      <ThemedText type="caption" style={[styles.title, { color: colors.secondaryText }]}>
        {STRINGS.TUTORIAL_SWIPE_TITLE}
      </ThemedText>

      <View style={[styles.wordCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText style={[styles.arabicWord, { color: colors.text }]}>
          {STRINGS.TUTORIAL_SAMPLE_WORD_ARABIC}
        </ThemedText>
      </View>

      <Animated.View style={[styles.handContainer, handStyle]}>
        <Ionicons name="hand-left-outline" size={40} color={colors.tint} />
      </Animated.View>

      <View style={styles.swipeRow}>
        <View style={styles.swipeIndicator}>
          <View style={[styles.indicator, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="chevron-back" size={20} color={colors.error} />
          </View>
          <ThemedText type="caption" weight="semibold" style={{ color: colors.error }}>
            {STRINGS.TUTORIAL_SWIPE_DONT_KNOW}
          </ThemedText>
          <ThemedText type="caption" style={styles.hint}>
            {STRINGS.TUTORIAL_SWIPE_DONT_KNOW_HINT}
          </ThemedText>
        </View>

        <View style={styles.swipeIndicator}>
          <View style={[styles.indicator, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="chevron-forward" size={20} color={colors.success} />
          </View>
          <ThemedText type="caption" weight="semibold" style={{ color: colors.success }}>
            {STRINGS.TUTORIAL_SWIPE_KNOW}
          </ThemedText>
          <ThemedText type="caption" style={styles.hint}>
            {STRINGS.TUTORIAL_SWIPE_KNOW_HINT}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

TutorialCoreFlowStep.displayName = 'TutorialCoreFlowStep';

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
    justifyContent: 'center',
    gap: LAYOUT.SPACING.XXLARGE,
  },
  swipeIndicator: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  indicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    opacity: 0.6,
  },
});
