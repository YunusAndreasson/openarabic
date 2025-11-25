/**
 * Tutorial card base component
 * Reusable content card wrapper for all tutorials (DRY!)
 */

import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { TUTORIAL_ANIMATION } from '@/constants/tutorials';

interface TutorialCardProps {
  /** Tutorial title */
  title: string;
  /** Tutorial description */
  description: string;
  /** Optional custom content above the description */
  children?: ReactNode;
  /** Optional dismiss button text (if not provided, no button shown) */
  dismissText?: string;
  /** Callback when dismiss button is pressed */
  onDismiss?: () => void;
}

/**
 * Base card component for tutorial content
 * Provides consistent styling and animation for all tutorials
 *
 * @example
 * ```tsx
 * <TutorialCard
 *   title="Tap words to practice"
 *   description="Tap any Arabic word while reading..."
 *   dismissText="Got it"
 *   onDismiss={handleDismiss}
 * >
 *   {/* Custom visual content *\/}
 *   <PulsingWordHighlights />
 * </TutorialCard>
 * ```
 */
export function TutorialCard({
  title,
  description,
  children,
  dismissText,
  onDismiss,
}: TutorialCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(TUTORIAL_ANIMATION.FADE_IN_DURATION)}
      exiting={FadeOutDown.duration(TUTORIAL_ANIMATION.FADE_OUT_DURATION)}
      style={styles.animatedWrapper}
    >
      <BaseCard shadowSize="large" style={styles.card} contentStyle={styles.cardContent}>
        {/* Title */}
        <ThemedText type="heading3" weight="bold" style={styles.title}>
          {title}
        </ThemedText>

        {/* Description */}
        {description && (
          <ThemedText type="body" style={styles.description}>
            {description}
          </ThemedText>
        )}

        {/* Custom content (e.g., pulsing highlights, animated hand) */}
        {children && <View style={styles.customContent}>{children}</View>}

        {/* Optional dismiss button */}
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
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE, // Override BaseCard's MEDIUM radius
  },
  cardContent: {
    padding: LAYOUT.SPACING.XLARGE,
  },
  customContent: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  title: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  description: {
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  button: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
