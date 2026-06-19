/**
 * Contextual help: Swipe left for Unknown
 */

import { Ionicons } from '@/components/ui/Icon';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_ANIMATION, TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

// Total cycle: delay + swipe left + swipe back + pause
const SWIPE_LEFT_CYCLE =
  TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT +
  TUTORIAL_ANIMATION.BOUNCE_DURATION +
  TIMING_CONSTANTS.TUTORIAL_DELAY_LONG;

// Keyframe percentages based on timing proportions
const swipeLeftPause1End = (TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT / SWIPE_LEFT_CYCLE) * 100;
const swipeLeftPeakEnd =
  ((TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT + TUTORIAL_ANIMATION.BOUNCE_DURATION / 2) /
    SWIPE_LEFT_CYCLE) *
  100;
const swipeLeftReturnEnd =
  ((TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT + TUTORIAL_ANIMATION.BOUNCE_DURATION) /
    SWIPE_LEFT_CYCLE) *
  100;

// CSS @keyframes replaces useEffect + withRepeat + withSequence + withDelay + withTiming
const handStyle = {
  animationName: {
    '0%': { transform: [{ translateX: 0 }] },
    [`${swipeLeftPause1End}%`]: { transform: [{ translateX: 0 }] },
    [`${swipeLeftPeakEnd}%`]: { transform: [{ translateX: -70 }] },
    [`${swipeLeftReturnEnd}%`]: { transform: [{ translateX: 0 }] },
    '100%': { transform: [{ translateX: 0 }] },
  },
  animationDuration: `${SWIPE_LEFT_CYCLE}ms`,
  animationIterationCount: 'infinite' as const,
  animationTimingFunction: 'ease-in-out',
};

export function TutorialSwipeLeftStep() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Description card with inline styled text */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText type="body" variant="secondary" style={styles.description}>
          {STRINGS.TUTORIAL_CONTEXT_LEFT_LINE1}{' '}
          <ThemedText type="body" weight="bold">
            {STRINGS.TUTORIAL_CONTEXT_LEFT_LINE2}
          </ThemedText>{' '}
          {STRINGS.TUTORIAL_CONTEXT_LEFT_LINE3}
        </ThemedText>
      </View>

      {/* Left indicator */}
      <View style={styles.indicatorRow}>
        <View
          style={[
            styles.indicator,
            { backgroundColor: withOpacity(colors.error, LAYOUT.OPACITY.FAINT) },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={TUTORIAL_VISUALS.INDICATOR_ICON_SIZE}
            color={colors.error}
          />
        </View>
        <ThemedText type="body" weight="semibold" colorName="error">
          {STRINGS.TUTORIAL_SWIPE_DONT_KNOW}
        </ThemedText>
      </View>

      {/* Animated hand swiping left */}
      <Animated.View style={[styles.handContainer, handStyle]}>
        <Ionicons name="hand-left-outline" size={TUTORIAL_VISUALS.ICON_SIZE} color={colors.text} />
      </Animated.View>
    </View>
  );
}

TutorialSwipeLeftStep.displayName = 'TutorialSwipeLeftStep';

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
