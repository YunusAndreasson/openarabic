import { PrimingCard } from '@/components/common';

import { STRINGS } from '@/constants/strings';

interface VoicePrimingCardProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Speak-the-answer offer, shown in the completion screen's priming slot — a
 * flagship feature, so it gets a real title (`heading3`) and the value
 * proposition rather than a footnote.
 *
 * It stands until answered: no "not now" snooze, just "Turn it on" or an
 * explicit "No thanks" that retires it for good.
 */
export const VoicePrimingCard = ({ onAccept, onDecline }: VoicePrimingCardProps) => (
  <PrimingCard
    acceptLabel={STRINGS.VOICE_PRIMING_ACCEPT}
    body={STRINGS.VOICE_PRIMING_BODY}
    declineLabel={STRINGS.VOICE_PRIMING_DECLINE}
    emphasis="flagship"
    title={STRINGS.VOICE_PRIMING_TITLE}
    onAccept={onAccept}
    onDecline={onDecline}
  />
);

VoicePrimingCard.displayName = 'VoicePrimingCard';
