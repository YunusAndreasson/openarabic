import { useCallback, useEffect, useRef } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { selectVoiceEnabled, setVoiceEnabled, setVoiceOfferDismissed } from '@/store/settingsSlice';

/**
 * Where the learner met the offer.
 *
 * `completion` is the only surface with a live caller. `review_header` — a
 * dormant mic in the review header, opening the offer as a sheet — no longer
 * exists; that whole header slot was removed, so nothing in the app can emit it
 * any more.
 *
 * `'review_header'` is kept so the union stays two-membered rather than
 * collapsing `source` into a compile-time constant, and so the value the
 * funnel's history already contains still type-checks. Do not add a new caller
 * for it; add a new member instead.
 *
 * Deliberately NOT an `@deprecated` tag: JSDoc cannot mark a single union
 * member, so the tag deprecated the whole alias — flagging every correct use of
 * the type that callers are required to pass.
 */
export type VoiceOfferSource = 'completion' | 'review_header';

export interface UseVoicePrimingResult {
  showPrimingCard: boolean;
  accept: () => void;
  decline: () => void;
}

/**
 * Is the speak-the-answer offer still open? Eligibility only, with no impression
 * tracking, for callers that need to know whether the ask is still outstanding
 * without making it (`useNotificationPriming` stands its own card aside while
 * this is true). Surfaces that actually put the offer on screen use
 * `useVoicePriming` so the impression is recorded.
 */
export function useVoiceOfferEligible(): boolean {
  const voiceEnabled = useAppSelectorShallow(selectVoiceEnabled);
  const dismissed = useAppSelectorShallow(state => state.settings.voiceOfferDismissed);
  return !voiceEnabled && !dismissed;
}

/**
 * The speak-the-answer offer.
 *
 * Speaking is a flagship feature, so the offer keeps standing rather than
 * snoozing itself: it stays available until the learner either turns it on or
 * explicitly says no. There is deliberately no session gate, no impression cap
 * and no persisted funnel state — the two booleans it needs (is it on, was it
 * refused) already live in persisted settings, so the whole policy is
 * `!on && !refused`.
 *
 * One surface carries it: **the completion screen**, which has room to make the
 * case and catches the learner just after practising, when an offer about HOW
 * they practise costs no attention. A second surface — a dormant mic in the
 * review header, opening the offer as a sheet — was removed with the rest of
 * that header slot; awareness now comes from the last `WelcomeIntro` slide and
 * from Account → Practice, neither of which interrupts a recall.
 *
 * `VOICE_FIRST_SESSION_GRACE` in `useNotificationPriming` is what keeps this
 * surface reachable early: without it the notification ask would take the
 * shared slot on the first completion and the offer would wait for the second.
 *
 * `accept()` only flips the setting, which is what starts the ~103 MB model
 * download. The microphone permission is NOT requested here — `startRecording`
 * asks the first time the learner actually speaks, so each ask lands at the
 * moment it makes sense instead of being bundled into one big yes/no.
 *
 * @param source which surface is making the offer, recorded on every event
 * @param rendered whether this surface is actually putting the offer on screen.
 *   The impression fires from here rather than from eligibility: the completion
 *   screen shares one slot with the notification card, and reporting an
 *   impression for a card that lost the slot inflates the funnel's denominator.
 */
export function useVoicePriming(source: VoiceOfferSource, rendered = true): UseVoicePrimingResult {
  const dispatch = useAppDispatch();
  const eligible = useVoiceOfferEligible();
  const shownRef = useRef(false);

  // Both the flag and the impression answer the same question, so they are built
  // from the same expression. Returning bare `eligible` while gating only the
  // effect on `rendered` would let a caller render a card that is never counted.
  const showPrimingCard = eligible && rendered;

  // Report the impression once per mount. The offer is persistent, so tracking
  // every render would drown the funnel in duplicates.
  useEffect(() => {
    if (!showPrimingCard || shownRef.current) return;
    shownRef.current = true;
    void analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_SHOWN, { source });
  }, [showPrimingCard, source]);

  const accept = useCallback((): void => {
    void analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_ACCEPTED, { source });
    // VoiceGradingProvider watches this and starts the model download.
    dispatch(setVoiceEnabled(true));
  }, [dispatch, source]);

  const decline = useCallback((): void => {
    void analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_DECLINED, { source });
    dispatch(setVoiceOfferDismissed(true));
  }, [dispatch, source]);

  return { showPrimingCard, accept, decline };
}
