/**
 * Contextual help: Swipe right for Known
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

// Total cycle: delay + swipe right + swipe back + pause
const SWIPE_RIGHT_CYCLE =
  TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT +
  TUTORIAL_ANIMATION.BOUNCE_DURATION +
  TIMING_CONSTANTS.TUTORIAL_DELAY_LONG;

// Keyframe percentages based on timing proportions
const swipeRightPause1End = (TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT / SWIPE_RIGHT_CYCLE) * 100;
const swipeRightPeakEnd =
  ((TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT + TUTORIAL_ANIMATION.BOUNCE_DURATION / 2) /
    SWIPE_RIGHT_CYCLE) *
  100;
const swipeRightReturnEnd =
  ((TIMING_CONSTANTS.TUTORIAL_DELAY_SHORT + TUTORIAL_ANIMATION.BOUNCE_DURATION) /
    SWIPE_RIGHT_CYCLE) *
  100;

// CSS @keyframes replaces useEffect + withRepeat + withSequence + withDelay + withTiming
const handStyle = {
  animationName: {
    '0%': { transform: [{ translateX: 0 }] },
    [`${swipeRightPause1End}%`]: { transform: [{ translateX: 0 }] },
    [`${swipeRightPeakEnd}%`]: { transform: [{ translateX: 70 }] },
    [`${swipeRightReturnEnd}%`]: { transform: [{ translateX: 0 }] },
    '100%': { transform: [{ translateX: 0 }] },
  },
  animationDuration: `${SWIPE_RIGHT_CYCLE}ms`,
  animationIterationCount: 'infinite' as const,
  animationTimingFunction: 'ease-in-out',
};

export function TutorialSwipeRightStep() {
  const colors = useColors();

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
        <View
          style={[styles.indicator, { backgroundColor: withOpacity(colors.success, LAYOUT.OPACITY.FAINT) }]}
        >
          <Ionicons
            name="chevron-forward"
            size={TUTORIAL_VISUALS.INDICATOR_ICON_SIZE}
            color={colors.success}
          />
        </View>
        <ThemedText type="body" weight="semibold" colorName="success">
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
