import type { FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

interface NotificationPrimingCardProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Primed "turn on smart reminders" ask on the review completion screen —
 * explains the forgetting-curve value before any OS permission dialog appears.
 * Text-only card: the calm sibling of the metric rows above it.
 */
export const NotificationPrimingCard: FC<NotificationPrimingCardProps> = ({
  onAccept,
  onDecline,
}) => (
  <BaseCard contentStyle={styles.content} shadowSize="small">
    <ThemedText type="bodyBold">{STRINGS.NOTIFICATION_PRIMING_TITLE}</ThemedText>
    <ThemedText style={styles.body} type="body" variant="secondary">
      {STRINGS.NOTIFICATION_PRIMING_BODY}
    </ThemedText>
    <ThemedButton
      style={styles.acceptButton}
      title={STRINGS.NOTIFICATION_PRIMING_ACCEPT}
      onPress={onAccept}
    />
    <Pressable
      accessibilityRole="button"
      hitSlop={LAYOUT.SPACING.SMALL}
      style={styles.declineButton}
      onPress={onDecline}
    >
      <ThemedText type="caption" variant="secondary">
        {STRINGS.NOTIFICATION_PRIMING_DECLINE}
      </ThemedText>
    </Pressable>
  </BaseCard>
);

const styles = StyleSheet.create({
  content: {
    padding: LAYOUT.SPACING.LARGE,
  },
  body: {
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  acceptButton: {
    alignSelf: 'stretch',
  },
  declineButton: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
