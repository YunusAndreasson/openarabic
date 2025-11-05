/**
 * Tutorial card base component
 * Reusable content card wrapper for all tutorials (DRY!)
 */

import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { TUTORIAL_ANIMATION } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

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
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeInUp.duration(TUTORIAL_ANIMATION.FADE_IN_DURATION)}
      exiting={FadeOutDown.duration(TUTORIAL_ANIMATION.FADE_OUT_DURATION)}
      style={[
        styles.card,
        {
          backgroundColor: colors.elevation2,
          ...LAYOUT.ELEVATION.LARGE,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* Custom content (e.g., pulsing highlights, animated hand) */}
      {children && <View style={styles.customContent}>{children}</View>}

      {/* Title */}
      <ThemedText type="heading3" weight="bold" style={styles.title}>
        {title}
      </ThemedText>

      {/* Description */}
      <ThemedText type="body" style={styles.description}>
        {description}
      </ThemedText>

      {/* Optional dismiss button */}
      {dismissText && onDismiss && (
        <ThemedButton
          title={dismissText}
          variant="filled"
          onPress={onDismiss}
          style={styles.button}
        />
      )}
    </Animated.View>
  );
}

TutorialCard.displayName = 'TutorialCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    padding: LAYOUT.SPACING.XLARGE,
    marginHorizontal: LAYOUT.SPACING.LARGE,
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
