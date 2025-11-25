/**
 * Swipe gesture tutorial component
 * Teaches users about swipe left/right gestures for practice sessions
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
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TutorialId, TUTORIALS, TUTORIAL_ANIMATION } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';

interface SwipeGestureTutorialProps {
  /** Whether the tutorial is visible */
  visible: boolean;
  /** Callback when tutorial is dismissed */
  onDismiss: () => void;
}

/**
 * Tutorial #2: Swipe Gestures (HIGH)
 * Shows animated hand demonstrating tap for hint, then swipe left (Unknown) or right (Know/Vague)
 */
export function SwipeGestureTutorial({ visible, onDismiss }: SwipeGestureTutorialProps) {
  const colors = useColors();
  const config = TUTORIALS[TutorialId.SWIPE_GESTURE];

  // Hand animation: tap → swipe left → center → tap → swipe right → center (loop)
  const handTranslateX = useSharedValue(0);
  const handScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Animate hand: tap → swipe left → tap → swipe right (loop 3 times)
      handTranslateX.value = withRepeat(
        withSequence(
          // Tap at center (pause)
          withDelay(300, withTiming(0)),

          // Swipe left (Unknown)
          withTiming(-100, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
          withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),

          // Pause at center
          withDelay(400, withTiming(0)),

          // Tap at center again
          withDelay(300, withTiming(0)),

          // Swipe right (Know)
          withTiming(100, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
          withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),

          // Pause before loop
          withDelay(400, withTiming(0)),
        ),
        3, // Loop 3 times
        false,
      );

      // Scale animation for tap gesture - happens before each swipe
      handScale.value = withRepeat(
        withSequence(
          // First tap (before left swipe)
          withTiming(0.85, { duration: 150 }),
          withTiming(1, { duration: 150 }),
          withDelay(TUTORIAL_ANIMATION.BOUNCE_DURATION + 400, withTiming(1)),

          // Second tap (before right swipe)
          withTiming(0.85, { duration: 150 }),
          withTiming(1, { duration: 150 }),
          withDelay(TUTORIAL_ANIMATION.BOUNCE_DURATION + 400, withTiming(1)),
        ),
        3,
        false,
      );
    }
  }, [visible, handTranslateX, handScale]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handTranslateX.value }, { scale: handScale.value }],
  }));

  return (
    <TutorialOverlay visible={visible} onDismiss={onDismiss}>
      <TutorialCard
        title={config.title}
        description={config.description}
        dismissText={STRINGS.TUTORIAL_START_PRACTICING}
        onDismiss={onDismiss}
      >
        {/* Primary group: Hand + Swipe options (Gestalt: proximity) */}
        <View style={styles.primaryGroup}>
          {/* Animated hand - focal point */}
          <Animated.View style={[styles.handContainer, handStyle]}>
            <Ionicons name="hand-left-outline" size={56} color={colors.tint} />
          </Animated.View>

          {/* Swipe directions - symmetric layout (Gestalt: symmetry) */}
          <View style={styles.swipeRow}>
            <View style={styles.swipeIndicator}>
              <View style={[styles.indicator, { backgroundColor: colors.error }]}>
                <Ionicons name="chevron-back" size={22} color={colors.white} />
              </View>
              <ThemedText type="body" colorName="error" style={styles.label}>
                {STRINGS.TUTORIAL_SWIPE_DONT_KNOW}
              </ThemedText>
            </View>

            <View style={styles.swipeIndicator}>
              <View style={[styles.indicator, { backgroundColor: colors.success }]}>
                <Ionicons name="chevron-forward" size={22} color={colors.white} />
              </View>
              <ThemedText type="body" colorName="success" style={styles.label}>
                {STRINGS.TUTORIAL_SWIPE_KNOW}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Secondary group: Unsure option (Gestalt: figure/ground separation) */}
        <View style={[styles.secondaryGroup, { backgroundColor: colors.elevation1 }]}>
          <View style={[styles.unsureIndicator, { backgroundColor: colors.warning }]}>
            <Ionicons name="hand-left-outline" size={16} color={colors.white} />
          </View>
          <View style={styles.unsureTextContainer}>
            <ThemedText type="caption" weight="semibold">
              {STRINGS.TUTORIAL_SWIPE_UNSURE}
            </ThemedText>
            <ThemedText type="caption" colorName="textTertiary">
              {STRINGS.TUTORIAL_SWIPE_UNSURE_HINT}
            </ThemedText>
          </View>
        </View>
      </TutorialCard>
    </TutorialOverlay>
  );
}

SwipeGestureTutorial.displayName = 'SwipeGestureTutorial';

const styles = StyleSheet.create({
  // Primary group: hand + main swipe options (Gestalt: proximity)
  primaryGroup: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  handContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  swipeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.XXXLARGE,
  },
  swipeIndicator: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    width: 80, // Fixed width for symmetry
  },
  indicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    textAlign: 'center',
  },
  // Secondary group: unsure option (Gestalt: figure/ground)
  secondaryGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  unsureIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsureTextContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
});
