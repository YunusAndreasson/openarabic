/**
 * Minimal tutorial card - visual-first, minimal text
 */

import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { BaseCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_ANIMATION } from '@/constants/tutorials';

interface TutorialCardProps {
  /** Visual content */
  children?: ReactNode;
  /** Optional dismiss button text */
  dismissText?: string;
  /** Callback when dismiss button is pressed */
  onDismiss?: () => void;
  /**
   * Skip affordance in the top-right. Backdrop tap alone is not discoverable —
   * without this the only visible way out of a tutorial is to finish it.
   */
  onSkip?: () => void;
}

/**
 * Minimal card wrapper for tutorial visuals
 */
export function TutorialCard({ children, dismissText, onDismiss, onSkip }: TutorialCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(TUTORIAL_ANIMATION.FADE_IN_DURATION)}
      exiting={FadeOutDown.duration(TUTORIAL_ANIMATION.FADE_OUT_DURATION)}
    >
      <BaseCard shadowSize="large" style={styles.card} contentStyle={styles.cardContent}>
        {onSkip && (
          <View style={styles.skipRow}>
            <ThemedButton
              hapticType="none"
              size="small"
              title={STRINGS.ONBOARDING_SKIP}
              variant="ghost"
              onPress={onSkip}
            />
          </View>
        )}

        {children}

        {dismissText && onDismiss && (
          <ThemedButton
            title={dismissText}
            variant="filled"
            onPress={onDismiss}
            style={styles.button}
          />
        )}
      </BaseCard>
    </Animated.View>
  );
}

TutorialCard.displayName = 'TutorialCard';

const styles = StyleSheet.create({
  // No horizontal margin here — TutorialOverlay's contentContainer already owns
  // the gutter. Having both gave every tutorial a 32pt inset nobody chose.
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  cardContent: {
    padding: LAYOUT.SPACING.XLARGE,
  },
  skipRow: {
    alignItems: 'flex-end',
  },
  button: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});
