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
        dismissText="Start practicing"
        onDismiss={onDismiss}
      >
        {/* Animated hand - primary focal point */}
        <Animated.View style={[styles.handContainer, handStyle]}>
          <Ionicons name="hand-left-outline" size={72} color={colors.tint} />
        </Animated.View>

        {/* Swipe directions with chevrons */}
        <View style={styles.swipeRow}>
          <View style={styles.swipeIndicator}>
            <View style={[styles.indicator, { backgroundColor: colors.error }]}>
              <Ionicons name="chevron-back" size={28} color={colors.white} />
            </View>
            <ThemedText type="body" colorName="error" style={styles.label}>
              Unknown
            </ThemedText>
          </View>

          <ThemedText type="heading3" colorName="textTertiary" style={styles.divider}>
            or
          </ThemedText>

          <View style={styles.swipeIndicator}>
            <View style={[styles.indicator, { backgroundColor: colors.success }]}>
              <Ionicons name="chevron-forward" size={28} color={colors.white} />
            </View>
            <ThemedText type="body" colorName="success" style={styles.label}>
              Know
            </ThemedText>
          </View>
        </View>

        {/* Vague option - visually separated */}
        <View style={styles.vagueSeparator}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.vagueSection}>
          <View
            style={[styles.indicator, styles.vagueIndicator, { backgroundColor: colors.warning }]}
          >
            <Ionicons name="hand-left-outline" size={20} color={colors.white} />
          </View>
          <View style={styles.vagueText}>
            <ThemedText type="body" weight="medium">
              Tap screen for hint
            </ThemedText>
            <ThemedText type="caption" colorName="textTertiary">
              Then swipe right = Vague
            </ThemedText>
          </View>
        </View>
      </TutorialCard>
    </TutorialOverlay>
  );
}

SwipeGestureTutorial.displayName = 'SwipeGestureTutorial';

const styles = StyleSheet.create({
  handContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  swipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  swipeIndicator: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  indicator: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
  },
  divider: {
    marginHorizontal: LAYOUT.SPACING.SMALL,
  },
  vagueSeparator: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  dividerLine: {
    height: 1,
    width: '100%',
  },
  vagueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  vagueIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  vagueText: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
});
