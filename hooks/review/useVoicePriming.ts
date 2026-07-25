import { useCallback, useEffect, useRef } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setVoiceEnabled, setVoiceOfferDismissed } from '@/store/settingsSlice';

export interface UseVoicePrimingResult {
  showPrimingCard: boolean;
  accept: () => void;
  decline: () => void;
}

/**
 * The speak-the-answer offer on the review completion screen.
 *
 * Sits at the end of a session rather than before one: the completion screen
 * has the room to make the case, and the learner has just finished practising,
 * so an offer about HOW they practise costs no attention. The review screen
 * itself is deliberately not an option — its empty space is the design (the
 * word floats on the background, see ReviewFlipCard), and a download pitch
 * beside a card someone is trying to recall competes with the recall.
 *
 * Speaking is a flagship feature, so the offer keeps standing rather than
 * snoozing itself: it shows on every completion until the learner either turns
 * it on or explicitly says no. There is deliberately no session gate, no
 * impression cap and no persisted funnel state — the two booleans it needs (is
 * it on, was it refused) already live in persisted settings, so the whole
 * policy is `!on && !refused`.
 *
 * `accept()` only flips the setting, which is what starts the model download.
 * The microphone permission is NOT requested here — `startRecording` asks the
 * first time the learner actually speaks, so each ask lands at the moment it
 * makes sense instead of being bundled into one big yes/no.
 */
export function useVoicePriming(): UseVoicePrimingResult {
  const dispatch = useAppDispatch();
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  const dismissed = useAppSelectorShallow(state => state.settings.voiceOfferDismissed);
  const shownRef = useRef(false);

  const showPrimingCard = !voiceEnabled && !dismissed;

  // Report the impression once per mount. The card is persistent, so tracking
  // every render would drown the funnel in duplicates.
  useEffect(() => {
    if (!showPrimingCard || shownRef.current) return;
    shownRef.current = true;
    analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_SHOWN);
  }, [showPrimingCard]);

  const accept = useCallback((): void => {
    analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_ACCEPTED);
    // VoiceGradingProvider watches this and starts the model download.
    dispatch(setVoiceEnabled(true));
  }, [dispatch]);

  const decline = useCallback((): void => {
    analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_DECLINED);
    dispatch(setVoiceOfferDismissed(true));
  }, [dispatch]);

  return { showPrimingCard, accept, decline };
}
