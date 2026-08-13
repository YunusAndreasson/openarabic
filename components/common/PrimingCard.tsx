import { BaseCard } from '@/components/common/BaseCard';
import type { FC } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

interface PrimingCardProps {
  title: string;
  body: string;
  acceptLabel: string;
  onAccept: () => void;
  declineLabel: string;
  onDecline: () => void;
  /**
   * `heading3` for a flagship offer, `bodyBold` for a quieter one. Only the
   * title weight distinguishes the two cards that use this.
   */
  emphasis?: 'flagship' | 'quiet';
}

/**
 * A permission/feature offer shown in the review completion screen's priming
 * slot: title, value proposition, one accept action, one explicit decline.
 *
 * The voice and notification cards were separate files with 4-key-identical
 * StyleSheets differing only in `body.marginTop`, rendered into the same slot.
 *
 * The accept action is OUTLINED, never filled, and that restraint has to
 * survive: the completion screen anchors its own filled button ("Review N
 * more" / done) directly below this slot. Two stacked filled buttons of the
 * same colour and neither reads as the primary thing to do. The notification
 * card used to break this rule while its sibling's comment claimed it didn't.
 */
export const PrimingCard: FC<PrimingCardProps> = ({
  title,
  body,
  acceptLabel,
  onAccept,
  declineLabel,
  onDecline,
  emphasis = 'quiet',
}) => (
  <BaseCard contentStyle={styles.content}>
    <ThemedText type={emphasis === 'flagship' ? 'heading3' : 'bodyBold'}>{title}</ThemedText>
    <ThemedText colorName="secondaryText" style={styles.body} type="body">
      {body}
    </ThemedText>
    <ThemedButton fullWidth title={acceptLabel} variant="outlined" onPress={onAccept} />
    <ThemedButton
      fullWidth
      hapticType="none"
      size="small"
      title={declineLabel}
      variant="ghost"
      onPress={onDecline}
    />
  </BaseCard>
);

const styles = StyleSheet.create({
  content: {
    padding: LAYOUT.SPACING.LARGE,
  },
  body: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
});

PrimingCard.displayName = 'PrimingCard';
