import { PrimingCard } from '@/components/common';
import type { FC } from 'react';

import { STRINGS } from '@/constants/strings';

interface NotificationPrimingCardProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Primed "turn on smart reminders" ask on the review completion screen —
 * explains the forgetting-curve value before any OS permission dialog appears.
 * The calm sibling of the metric rows above it, so it takes the quiet title.
 */
export const NotificationPrimingCard: FC<NotificationPrimingCardProps> = ({
  onAccept,
  onDecline,
}) => (
  <PrimingCard
    acceptLabel={STRINGS.NOTIFICATION_PRIMING_ACCEPT}
    body={STRINGS.NOTIFICATION_PRIMING_BODY}
    declineLabel={STRINGS.NOTIFICATION_PRIMING_DECLINE}
    title={STRINGS.NOTIFICATION_PRIMING_TITLE}
    onAccept={onAccept}
    onDecline={onDecline}
  />
);

NotificationPrimingCard.displayName = 'NotificationPrimingCard';
