import type { FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

interface VoicePrimingCardProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Speak-the-answer offer, shown in the completion screen's priming slot — a
 * flagship feature, so it gets a real title, the value proposition, and a
 * full-width action rather than a footnote.
 *
 * It stands until answered: no "not now" snooze, just "Turn it on" or an
 * explicit "No thanks" that retires it for good.
 *
 * The action is OUTLINED, not filled, and that restraint has to survive: the
 * completion screen anchors its own filled button ("Review N more" / done)
 * right below this slot. Two filled buttons of the same colour, stacked, and
 * neither reads as the primary thing to do. Outlined keeps this unmistakably
 * tappable while leaving exactly one filled action on the screen — the same
 * reason NotificationPrimingCard, which shares this slot, stays text-only.
 */
export const VoicePrimingCard: FC<VoicePrimingCardProps> = ({ onAccept, onDecline }) => (
  <BaseCard contentStyle={styles.content} shadowSize="small">
    <ThemedText type="heading3">{STRINGS.VOICE_PRIMING_TITLE}</ThemedText>
    <ThemedText style={styles.body} type="body" variant="secondary">
      {STRINGS.VOICE_PRIMING_BODY}
    </ThemedText>
    <ThemedButton
      style={styles.acceptButton}
      title={STRINGS.VOICE_PRIMING_ACCEPT}
      variant="outlined"
      onPress={onAccept}
    />
    <Pressable
      accessibilityRole="button"
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      style={styles.declineButton}
      onPress={onDecline}
    >
      <ThemedText type="caption" variant="secondary">
        {STRINGS.VOICE_PRIMING_DECLINE}
      </ThemedText>
    </Pressable>
  </BaseCard>
);

VoicePrimingCard.displayName = 'VoicePrimingCard';

const styles = StyleSheet.create({
  content: {
    padding: LAYOUT.SPACING.LARGE,
  },
  body: {
    marginTop: LAYOUT.SPACING.SMALL,
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
