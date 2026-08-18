import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { SheetScreen } from '@/components/common';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useVoicePriming } from '@/hooks/review/useVoicePriming';

/**
 * The speak-the-answer offer, opened from the dormant mic in the review header.
 *
 * Deliberately NOT `PrimingCard`, despite showing the same four strings. That
 * component's accept action is outlined, and its own doc explains why: on the
 * completion screen it sits directly above an anchored filled button, so two
 * filled buttons would leave neither reading as primary. Here the offer IS the
 * screen and there is nothing to compete with, so the accept is filled and
 * carries the weight a primary action should. Reusing the card would have
 * imported a constraint that does not exist on this surface.
 *
 * Both answers close the sheet, so the learner returns to the card they were
 * recalling rather than being left on an offer they have already answered. The
 * mic permission is not requested here — accepting starts the model download,
 * and `startRecording` asks for the microphone the first time they speak.
 */
export default function VoiceOfferScreen(): JSX.Element | null {
  const router = useRouter();
  const { showPrimingCard, accept, decline } = useVoicePriming('review_header');

  // One answer per visit. The two buttons carry independent press locks, so
  // without this a second tap inside the ~300ms dismiss animation would write
  // both settings — voice on AND the offer refused, a combination no other path
  // produces — and fire a second `back()` that pops the review session out from
  // under the learner mid-card.
  //
  // The ref is the guard (it settles synchronously, so two taps in one frame
  // cannot both pass) and the state is what render reads — the React Compiler
  // rejects reading a ref during render.
  const answeredRef = useRef(false);
  const [answered, setAnswered] = useState(false);

  const answer = useCallback(
    (respond: () => void) => () => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      setAnswered(true);
      respond();
      if (router.canGoBack()) router.back();
    },
    [router],
  );

  // Reachable while the offer is already settled: a stale back-stack entry after
  // voice was turned on from Account, or a direct deep link. Pitching a feature
  // that is already on would be confusing, and worse, "No thanks" would record a
  // refusal against a decision the learner never made.
  useEffect(() => {
    if (showPrimingCard || answeredRef.current) return;
    if (router.canGoBack()) router.back();
  }, [showPrimingCard, router]);

  // Answering flips `showPrimingCard` false in the same tick as `back()`, so the
  // ref keeps the content mounted through the dismiss animation rather than
  // blanking the sheet mid-slide.
  if (!showPrimingCard && !answered) return null;

  return (
    <SheetScreen>
      <ThemedText type="heading2">{STRINGS.VOICE_PRIMING_TITLE}</ThemedText>
      <ThemedText colorName="secondaryText" style={styles.body} type="body">
        {STRINGS.VOICE_PRIMING_BODY}
      </ThemedText>
      <ThemedButton
        fullWidth
        title={STRINGS.VOICE_PRIMING_ACCEPT}
        variant="filled"
        onPress={answer(accept)}
      />
      <ThemedButton
        fullWidth
        hapticType="none"
        size="small"
        title={STRINGS.VOICE_PRIMING_DECLINE}
        variant="ghost"
        onPress={answer(decline)}
      />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
});
