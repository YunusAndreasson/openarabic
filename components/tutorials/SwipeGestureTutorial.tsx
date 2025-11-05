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
import { LAYOUT } from '@/constants/layout';
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
 * Shows animated hand demonstrating swipe left (Don't Know) and swipe right (Know)
 */
export function SwipeGestureTutorial({ visible, onDismiss }: SwipeGestureTutorialProps) {
  const colors = useColors();
  const config = TUTORIALS[TutorialId.SWIPE_GESTURE];

  // Hand animation: swipe left → center → swipe right → center (loop 3 times)
  const handTranslateX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Animate hand: center → left → center → right → center (loop 3 times then pause)
      handTranslateX.value = withRepeat(
        withSequence(
          // Swipe left (Don't Know)
          withTiming(-60, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
          withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
          withDelay(200, withTiming(0)), // Pause at center

          // Swipe right (Know)
          withTiming(60, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
          withTiming(0, { duration: TUTORIAL_ANIMATION.BOUNCE_DURATION / 2 }),
          withDelay(200, withTiming(0)), // Pause at center
        ),
        3, // Loop 3 times
        false,
      );
    }
  }, [visible, handTranslateX]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handTranslateX.value }],
  }));

  return (
    <TutorialOverlay visible={visible} onDismiss={onDismiss}>
      <TutorialCard title={config.title} description={config.description}>
        {/* Swipe gesture demonstration */}
        <View style={styles.gestureContainer}>
          {/* Left indicator (Don't Know) */}
          <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, { backgroundColor: colors.error }]}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </View>
            <ThemedText type="caption" colorName="error" style={styles.indicatorLabel}>
              Don't Know
            </ThemedText>
          </View>

          {/* Animated hand icon */}
          <Animated.View style={[styles.handContainer, handStyle]}>
            <Ionicons name="hand-left-outline" size={48} color={colors.tint} />
          </Animated.View>

          {/* Right indicator (Know) */}
          <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, { backgroundColor: colors.success }]}>
              <Ionicons name="chevron-forward" size={24} color={colors.white} />
            </View>
            <ThemedText type="caption" colorName="success" style={styles.indicatorLabel}>
              Know
            </ThemedText>
          </View>
        </View>

        {/* Subtitle: or tap buttons */}
        <ThemedText type="caption" colorName="textTertiary" style={styles.subtitle}>
          or tap the buttons
        </ThemedText>
      </TutorialCard>
    </TutorialOverlay>
  );
}

SwipeGestureTutorial.displayName = 'SwipeGestureTutorial';

const styles = StyleSheet.create({
  gestureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  indicatorContainer: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  indicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
  },
  handContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
