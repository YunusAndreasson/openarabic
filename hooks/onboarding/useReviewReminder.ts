import { useIsFocused } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { fsrsQueries } from '@/constants/queries';
import type { FirstReview } from '@/services/firstReview';
import {
  makeReminderPlan,
  observeReminderPlan,
  readReminderAccess,
  requestReviewReminder,
  syncVerifiedReminderPlan,
} from '@/services/notificationService';
import {
  claimReminderOffer,
  claimReminderRecovery,
  currentReminderSession,
  pendingReminderReturn,
  reminderAction,
} from '@/services/reviewReminderJourney';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { remindersToggled } from '@/store/settingsSlice';
import { readSmartReminderPrefs } from '@/utils/smartReminderPrefs';
import type { ReminderObservation } from '@/utils/reviewReminderPlan';
import { filterDueWords } from '@/utils/newWordPacing';

type State = 'hidden' | 'offer' | 'recovery' | 'off' | 'error' | 'on' | 'busy';
type Offer = NonNullable<Awaited<ReturnType<typeof claimReminderOffer>>>;

async function openNotificationSettings() {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 26 && Application.applicationId) {
    await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: Application.applicationId },
    ]);
  } else if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:notifications').catch(() => Linking.openSettings());
  } else await Linking.openSettings();
}

export function useReviewReminder(owner: string, review?: FirstReview) {
  const focused = useIsFocused();
  const cache = useQueryClient();
  const dispatch = useAppDispatch();
  const pref = useAppSelector(s => s.settings.reminderTime);
  const { data: words, isFetching } = useQuery(fsrsQueries.all(owner));
  const [state, setState] = useState<State>('hidden');
  const [next, setNext] = useState<number>();
  const [clock, refresh] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const offer = useRef<Offer | null>(null);
  const recovery = useRef(false);
  const dismissed = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  const [settingsAction, setSettingsAction] = useState(false);
  const waitingForRecoveryAction = useRef(false);
  const [due, setDue] = useState<NonNullable<typeof words>[number]>();
  const results = useEffectEvent((observedOwner?: string, observation?: ReminderObservation) => {
    if (
      !offer.current?.attempt ||
      dismissed.current ||
      waitingForRecoveryAction.current ||
      !mounted.current
    )
      return;
    if (!observation || owner !== observedOwner) {
      if (!busy.current) {
        setNext(undefined);
        setState('off');
      }
      return;
    }
    if (observation.result === 'verified') offer.current.state = 'enabled';
    if (observation.result === 'restricted') offer.current.state = 'declined';
    setNext(observation.times[0]);
    setState(
      observation.result === 'verified'
        ? 'on'
        : observation.result === 'restricted' || observation.result === 'disabled'
          ? 'off'
          : 'error',
    );
  });

  useEffect(() => {
    mounted.current = true;
    const stop = observeReminderPlan(results);
    const sub = AppState.addEventListener('change', value => {
      setActive(value === 'active');
      if (value === 'active') refresh(n => n + 1);
    });
    return () => {
      mounted.current = false;
      stop();
      sub.remove();
    };
  }, []);

  async function prefs() {
    const mirror = await readSmartReminderPrefs();
    const lastSessionCompletedAt =
      cache.getQueryData<number>(fsrsQueries.lastCompletedAtKey(owner)) ??
      (mirror?.owner === owner ? mirror.lastSessionCompletedAt : undefined) ??
      review?.completedAt;
    return { ...pref, owner, lastSessionCompletedAt };
  }

  async function reconcile(grantPreference: boolean, valid: () => boolean) {
    if (!words) return;
    const settings = await prefs();
    const access = await readReminderAccess();
    if (!valid()) return;
    if (grantPreference && access.full && access.channel) {
      settings.enabled = true;
      dispatch(remindersToggled(true));
    }
    // Keep the actual preference in the observation, including a refusal at the OS dialog.
    const observation = await syncVerifiedReminderPlan(
      words,
      settings,
      owner,
      'review-reminder',
      valid,
      grantPreference,
    );
    if (valid() && observation.result === 'error') setState('error');
  }

  const evaluate = useEffectEvent(async (valid: () => boolean) => {
    if (!words || busy.current || dismissed.current || !valid()) return;
    if (state === 'on') {
      setNext(undefined);
      setState('busy');
    }
    const settings = await prefs();
    if (!valid()) return;
    const eligibleWord = filterDueWords(words, {
      nowMs: Date.now(),
      lastCompletedAt: settings.lastSessionCompletedAt,
    }).find(word => word.root);
    if (!recovery.current && eligibleWord && !isFetching) {
      let needsSettings = false;
      const later = await claimReminderRecovery(owner, valid, async () => {
        const access = await readReminderAccess();
        needsSettings = !access.full && !access.canAskAgain;
        return access.raw !== 'unavailable' && !(pref.enabled && access.full && access.channel);
      });
      if (later && valid()) {
        offer.current = later;
        recovery.current = true;
        setDue(eligibleWord);
        setSettingsAction(later.state === 'declined' || needsSettings);
        waitingForRecoveryAction.current = true;
        setState('recovery');
        return;
      }
    }
    if (recovery.current && !offer.current?.attempt) return;
    if (waitingForRecoveryAction.current) return;
    if (!recovery.current) {
      if (!review) {
        const pending = await pendingReminderReturn(owner);
        if (!valid()) return;
        if (!pending) {
          if (offer.current?.state === 'enabled') await reconcile(false, valid);
          return;
        }
        offer.current = pending;
        await reconcile(true, valid);
        return;
      }
      if (review.step !== 'complete') return;
      const eligible = makeReminderPlan(words, settings).length > 0;
      if (!eligible && !offer.current?.attempt) {
        setState('hidden');
        return;
      }
      const first = await claimReminderOffer(
        owner,
        review.id,
        review.completionSession,
        review.completedAt ?? Date.now(),
        valid,
      );
      if (!first || !valid()) return;
      offer.current = first;
      if (first.state === 'offered') {
        setState(
          first.session === currentReminderSession() && !first.recoverySpent ? 'offer' : 'hidden',
        );
        return;
      }
      if (first.state === 'declined' && !pref.enabled) {
        setState('off');
        return;
      }
    }
    await reconcile(offer.current?.state === 'requested', valid);
  });

  useEffect(() => {
    let live = true;
    const valid = () => live && mounted.current && focused && AppState.currentState === 'active';
    if (active && focused)
      void evaluate(valid).catch(() => {
        if (valid() && offer.current) setState('error');
      });
    if (!focused && recovery.current) {
      dismissed.current = true;
      setState('hidden');
    }
    return () => {
      live = false;
    };
  }, [active, focused, words, isFetching, pref, clock, review, owner]);

  useEffect(() => {
    if (!next || !focused || !active) return;
    const timer = setTimeout(
      () => {
        setNext(undefined);
        setState('busy');
        refresh(n => n + 1);
      },
      Math.max(0, next - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [next, active, focused]);

  const stillMounted = () => mounted.current;
  async function act() {
    const current = offer.current;
    if (!current || busy.current) return;
    busy.current = true;
    setState('busy');
    try {
      if (state === 'error' && current.attempt) {
        await reconcile(true, () => mounted.current);
        return;
      }
      waitingForRecoveryAction.current = false;
      const settings = state === 'recovery' && settingsAction;
      const action = settings ? 'open_settings' : 'request';
      const attempt = await reminderAction(owner, action);
      if (!mounted.current) return;
      if (!attempt) {
        setState('error');
        return;
      }
      offer.current = { ...current, attempt, state: 'requested' };
      if (settings) {
        await openNotificationSettings();
        if (stillMounted()) setState('off');
        return;
      }
      await requestReviewReminder(attempt, current.source);
      if (stillMounted()) await reconcile(true, () => mounted.current);
    } catch {
      if (stillMounted()) setState('error');
    } finally {
      busy.current = false;
    }
  }
  function dismiss() {
    dismissed.current = true;
    setState('hidden');
    void reminderAction(owner, 'dismiss').catch(() => undefined);
  }
  return {
    state,
    next,
    pref,
    due: state === 'recovery' ? due : undefined,
    act,
    dismiss,
    settingsAction,
  };
}
