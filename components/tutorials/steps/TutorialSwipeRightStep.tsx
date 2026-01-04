/**
 * Contextual help: Swipe right for Known
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
import { TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_ANIMATION, TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

export function TutorialSwipeRightStep() {
  const colors = useColors();
  const handTranslateX = useSharedValue(0);

  useEffect(() => {
    // Animate hand swiping right only
    handTranslateX.value = withRepeat(
      withSequence(
        withDelay(TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT, withTiming(0)),
        withTiming(70, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
        withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
        withDelay(TIMING_CONSTANTS.TUTORIAL_DELAY_LONG, withTiming(0)),
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
      {/* Description card with inline styled text */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText type="body" variant="secondary" style={styles.description}>
          {STRINGS.TUTORIAL_CONTEXT_RIGHT_LINE1}{' '}
          <ThemedText type="body" weight="bold">
            {STRINGS.TUTORIAL_CONTEXT_RIGHT_LINE2}
          </ThemedText>{' '}
          {STRINGS.TUTORIAL_CONTEXT_RIGHT_LINE3}
        </ThemedText>
      </View>

      {/* Right indicator */}
      <View style={styles.indicatorRow}>
        <View style={[styles.indicator, { backgroundColor: colors.success + '20' }]}>
          <Ionicons
            name="chevron-forward"
            size={TUTORIAL_VISUALS.INDICATOR_ICON_SIZE}
            color={colors.success}
          />
        </View>
        <ThemedText type="body" weight="semibold" style={{ color: colors.success }}>
          {STRINGS.TUTORIAL_SWIPE_KNOW}
        </ThemedText>
      </View>

      {/* Animated hand swiping right */}
      <Animated.View style={[styles.handContainer, handStyle]}>
        <Ionicons name="hand-left-outline" size={TUTORIAL_VISUALS.ICON_SIZE} color={colors.text} />
      </Animated.View>
    </View>
  );
}

TutorialSwipeRightStep.displayName = 'TutorialSwipeRightStep';

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
  indicatorRow: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  indicator: {
    width: TUTORIAL_VISUALS.INDICATOR_SIZE,
    height: TUTORIAL_VISUALS.INDICATOR_SIZE,
    borderRadius: TUTORIAL_VISUALS.INDICATOR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handContainer: {
    // Hand at bottom, no extra margin needed
  },
});
