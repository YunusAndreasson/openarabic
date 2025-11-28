/**
 * Minimal tutorial card - visual-first, minimal text
 */

import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { BaseCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { TUTORIAL_ANIMATION } from '@/constants/tutorials';

interface TutorialCardProps {
  /** Visual content */
  children?: ReactNode;
  /** Optional dismiss button text */
  dismissText?: string;
  /** Callback when dismiss button is pressed */
  onDismiss?: () => void;
}

/**
 * Minimal card wrapper for tutorial visuals
 */
export function TutorialCard({ children, dismissText, onDismiss }: TutorialCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(TUTORIAL_ANIMATION.FADE_IN_DURATION)}
      exiting={FadeOutDown.duration(TUTORIAL_ANIMATION.FADE_OUT_DURATION)}
      style={styles.animatedWrapper}
    >
      <BaseCard shadowSize="large" style={styles.card} contentStyle={styles.cardContent}>
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
  animatedWrapper: {
    marginHorizontal: LAYOUT.SPACING.LARGE,
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  cardContent: {
    padding: LAYOUT.SPACING.XLARGE,
  },
  button: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});
