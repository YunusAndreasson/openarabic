import { PrimingCard } from '@/components/common';

import { STRINGS } from '@/constants/strings';
import type { CardElevation } from '@/types/ui/card.types';

interface NotificationPrimingCardProps {
  onAccept: () => void;
  onDecline: () => void;
  /** The completion screen's copy unless the moment needs its own */
  body?: string;
  elevation?: CardElevation;
}

/**
 * Primed "turn on smart reminders" ask on the review completion screen, and
 * after the first saved word in the reader — explains the forgetting-curve
 * value before any OS permission dialog appears. The calm sibling of the metric
 * rows above it, so it takes the quiet title.
 */
export const NotificationPrimingCard = ({
  onAccept,
  onDecline,
  body = STRINGS.NOTIFICATION_PRIMING_BODY,
  elevation,
}: NotificationPrimingCardProps) => (
  <PrimingCard
    acceptLabel={STRINGS.NOTIFICATION_PRIMING_ACCEPT}
    body={body}
    declineLabel={STRINGS.NOTIFICATION_PRIMING_DECLINE}
    elevation={elevation}
    title={STRINGS.NOTIFICATION_PRIMING_TITLE}
    onAccept={onAccept}
    onDecline={onDecline}
  />
);

NotificationPrimingCard.displayName = 'NotificationPrimingCard';
