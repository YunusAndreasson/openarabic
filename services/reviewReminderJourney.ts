import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS as EVENTS, type AnalyticsEventName } from '@/constants/analytics';
import {
  widgetFirstForeground,
  recordWidgetChoice,
  observePlacement,
} from '@/services/widgets/placement';
import { STORAGE_KEYS, scopedKey } from '@/constants/storageKeys';
import { analytics } from '@/services/analytics';
import { loadInstallRecord } from '@/services/analyticsInstall';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { toLocalDateString } from '@/utils/dateTimeUtils';
import type { ReminderObservation } from '@/utils/reviewReminderPlan';

const key = STORAGE_KEYS.REVIEW_REMINDER_JOURNEY;
const transaction = createSerialQueue();
export const REMINDER_SESSION_TIMEOUT_MS = 30 * 60_000;

interface Session {
  id: string;
  number: number;
  start: number;
  newInstall: boolean;
  backgroundAt?: number;
}
interface Offer {
  owner: string;
  reviewId: string;
  completedAt: number;
  completionSession?: string;
  session: string;
  day: string;
  state: 'offered' | 'requested' | 'declined' | 'enabled';
  recoverySpent?: boolean;
  everVerified?: boolean;
  settingsReturn?: boolean;
  attempt?: string;
  source: 'first_completed_review' | 'later_due_practice' | 'settings';
}
interface Ledger {
  owner?: string;
  claimed?: boolean;
  withdrawnAt?: number;
  session?: Session;
  firstReviewId?: string;
  offer?: Offer;
  snapshot?: { times: number[]; at: number; revision: string };
}

const detailKey = (owner: string) => scopedKey(STORAGE_KEYS.REVIEW_REMINDER_DETAIL, owner);
async function read(owner?: string): Promise<Ledger> {
  const raw = await AsyncStorage.getItem(key);
  const row: Ledger = raw ? (JSON.parse(raw) as Ledger) : {};
  // Move the pre-split journal once. A guest never receives its private fields.
  if (row.offer || row.snapshot || row.firstReviewId) {
    const legacyOwner = row.offer?.owner;
    if (legacyOwner)
      await AsyncStorage.setItem(
        detailKey(legacyOwner),
        JSON.stringify({
          offer: row.offer,
          snapshot: row.snapshot,
          firstReviewId: row.firstReviewId ?? row.offer?.reviewId,
        }),
      );
    row.claimed = !!(row.offer || row.firstReviewId);
    delete row.offer;
    delete row.snapshot;
    delete row.firstReviewId;
    await AsyncStorage.setItem(key, JSON.stringify(row));
  }
  const privateRaw = owner ? await AsyncStorage.getItem(detailKey(owner)) : null;
  const detail = privateRaw
    ? (JSON.parse(privateRaw) as Pick<Ledger, 'offer' | 'snapshot' | 'firstReviewId'>)
    : {};
  return { ...row, ...detail, owner };
}
async function write(row: Ledger) {
  const { owner, offer, snapshot, firstReviewId, ...install } = row;
  if (owner)
    await AsyncStorage.setItem(
      detailKey(owner),
      JSON.stringify({ offer, snapshot, firstReviewId }),
    );
  await AsyncStorage.setItem(key, JSON.stringify(install));
}
export function purgeReminderDetail(owner: string) {
  return transaction(async () => {
    await read();
    await AsyncStorage.removeItem(detailKey(owner));
  });
}
let foreground: Session | undefined;
export const currentReminderSession = () => foreground?.id;

function track(
  name: AnalyticsEventName,
  session: Session,
  offer?: Offer,
  extra: Record<string, string | number | boolean | undefined> = {},
) {
  void analytics.track(name, {
    foreground_session_id: session.id,
    foreground_session_number: session.number,
    elapsed_ms: Date.now() - session.start,
    local_occurrence_time: new Date().toString(),
    flow_version: 1,
    arm: 'guided_reader',
    platform: Platform.OS,
    build: Application.nativeBuildVersion,
    review_session_id: offer?.reviewId,
    attempt_id: offer?.attempt,
    source: offer?.source,
    ...extra,
  });
}

function finishSession(row: Ledger, end: number) {
  const { session, offer, snapshot } = row;
  if (
    (row.withdrawnAt !== undefined &&
      row.withdrawnAt <= end &&
      row.withdrawnAt >= (snapshot?.at ?? 0)) ||
    !session ||
    !offer ||
    !snapshot ||
    !session.newInstall ||
    session.number !== 1 ||
    session.id !== offer.completionSession ||
    offer.state !== 'enabled'
  )
    return;
  const times = snapshot.times.filter(t => t > end);
  if (!times.length) return;
  track(EVENTS.FIRST_SESSION_REVIEW_AND_REMINDER, session, offer, {
    $insert_id: session.id + '-review-reminder',
    managed_future_count: times.length,
    earliest_trigger_timestamp: times[0],
    full_permission: true,
    channel_available: true,
    enabled_preference: true,
    plan_revision: snapshot.revision,
    verified_at: snapshot.at,
    completed_at: offer.completedAt,
    session_end: end,
    elapsed_ms: end - session.start,
    local_occurrence_time: new Date(end).toString(),
  });
}

/** Called only from genuine foreground lifecycle transitions. Short settings trips stay attached. */
export function enterReminderSession(cold: boolean, now = Date.now(), owner?: string) {
  return transaction(async () => {
    const row = await read(owner);
    const old = row.session;
    if (
      !old ||
      cold ||
      (old.backgroundAt !== undefined && now - old.backgroundAt >= REMINDER_SESSION_TIMEOUT_MS)
    ) {
      if (old)
        finishSession(
          row,
          old.backgroundAt !== undefined
            ? Math.min(now, old.backgroundAt + REMINDER_SESSION_TIMEOUT_MS)
            : (row.snapshot?.at ?? now),
        );
      const install = !old ? await loadInstallRecord() : undefined;
      row.session = {
        id: randomUUID(),
        number: (old?.number ?? 0) + 1,
        start: now,
        newInstall: !old && install?.installKind === 'new' && !install.firstOpenSent,
      };
      delete row.snapshot;
    } else {
      delete old.backgroundAt;
    }
    await write(row);
    foreground = row.session;
    if (foreground)
      void widgetFirstForeground(foreground.id, now)
        .then(() => observePlacement(currentReminderSession()))
        .catch(() => undefined);
    if (foreground)
      void analytics.registerSuperProperties({
        foreground_session_id: foreground.id,
        foreground_session_number: foreground.number,
      });
  });
}
export function backgroundReminderSession(now = Date.now()) {
  foreground = undefined;
  return transaction(async () => {
    const row = await read();
    if (row.session) {
      row.session.backgroundAt = now;
      await write(row);
    }
    foreground = undefined;
  });
}

// Mobile timers may be suspended. The next foreground uses the same boundary.
export function finishIdleReminderSession(now = Date.now(), owner?: string) {
  return transaction(async () => {
    const row = await read(owner);
    const left = row.session?.backgroundAt;
    if (
      foreground ||
      !row.snapshot ||
      left === undefined ||
      now < left + REMINDER_SESSION_TIMEOUT_MS
    )
      return;
    finishSession(row, left + REMINDER_SESSION_TIMEOUT_MS);
    delete row.snapshot;
    await write(row);
  });
}

export function recordFirstReminderReview(id: string, owner: string) {
  return transaction(async () => {
    const row = await read(owner);
    if (!row.claimed && !row.firstReviewId) {
      row.claimed = true;
      row.firstReviewId = id;
      await write(row);
    }
  });
}

export function recordSettingsReminderChoice(owner: string, enabled: boolean) {
  return transaction(async () => {
    const row = await read(owner);
    if (row.offer?.owner !== owner) return;
    delete row.snapshot;
    if (enabled) {
      row.offer.source = 'settings';
      row.offer.attempt = randomUUID();
      row.offer.state = 'requested';
    } else row.offer.state = 'declined';
    await write(row);
  });
}

export function claimReminderOffer(
  owner: string,
  reviewId: string,
  completionSession: string | undefined,
  completedAt: number,
  visible: () => boolean,
) {
  return transaction(async () => {
    const row = await read(owner);
    if (!foreground || !visible() || (row.claimed && row.firstReviewId !== reviewId)) return null;
    if (!row.offer) {
      row.claimed = true;
      row.firstReviewId = reviewId;
      row.offer = {
        owner,
        reviewId,
        completedAt,
        completionSession,
        session: foreground.id,
        day: toLocalDateString(new Date()),
        state: 'offered',
        source: 'first_completed_review',
      };
      await write(row);
      track(EVENTS.FIRST_REVIEW_REMINDER_OFFERED, foreground, row.offer, {
        $insert_id: reviewId + '-reminder-offer',
      });
    }
    return row.offer.owner === owner && row.offer.reviewId === reviewId ? row.offer : null;
  });
}

export function claimReminderRecovery(
  owner: string,
  visible: () => boolean,
  canShow: () => Promise<boolean> = () => Promise.resolve(true),
) {
  return transaction(async () => {
    const row = await read(owner);
    const offer = row.offer;
    if (
      !foreground ||
      offer?.owner !== owner ||
      offer.recoverySpent ||
      offer.everVerified ||
      offer.state === 'enabled' ||
      foreground.id === offer.session ||
      toLocalDateString(new Date()) <= offer.day ||
      !visible()
    )
      return null;
    if (!(await canShow()) || !visible()) return null;
    offer.recoverySpent = true;
    offer.source = 'later_due_practice';
    await write(row);
    track(EVENTS.REVIEW_REMINDER_RECOVERY_SHOWN, foreground, offer);
    return offer;
  });
}

export function pendingReminderReturn(owner: string) {
  return transaction(async () => {
    const { offer } = await read(owner);
    return offer?.state === 'requested' && offer.owner === owner ? offer : null;
  });
}

export function reminderAction(owner: string, action: 'request' | 'open_settings' | 'dismiss') {
  return transaction(async () => {
    const row = await read(owner);
    const offer = row.offer;
    if (!foreground || offer?.owner !== owner) return undefined;
    if (action !== 'dismiss') {
      void recordWidgetChoice(foreground.id, 'reminder').catch(() => undefined);
      offer.state = 'requested';
      offer.attempt = randomUUID();
      offer.settingsReturn = action === 'open_settings';
      await write(row);
      track(EVENTS.REVIEW_REMINDER_REQUESTED, foreground, offer);
    }
    if (offer.source === 'later_due_practice')
      track(EVENTS.REVIEW_REMINDER_RECOVERY_ACTION, foreground, offer, { action });
    return offer.attempt;
  });
}

export function recordReminderObservation(owner: string | undefined, result?: ReminderObservation) {
  return transaction(async () => {
    const row = await read(owner);
    const offer = row.offer;
    if (!owner) {
      row.withdrawnAt = Date.now();
      await write(row);
      return;
    }
    if (!offer) return;
    if (!foreground && row.snapshot && row.session) {
      // A headless replan can precede the next visible launch. Settle a session
      // that has already ended before changing its last observed plan.
      const left = row.session.backgroundAt;
      if (left === undefined || Date.now() >= left + REMINDER_SESSION_TIMEOUT_MS) {
        finishSession(
          row,
          left === undefined ? row.snapshot.at : left + REMINDER_SESSION_TIMEOUT_MS,
        );
        delete row.snapshot;
        await write(row);
      }
    }
    if (!owner || owner !== offer.owner || !result) {
      if (row.snapshot) {
        delete row.snapshot;
        await write(row);
      }
      return;
    }
    if (!offer.attempt) return;
    if (!foreground) {
      if (
        row.snapshot &&
        (result.result !== 'verified' || row.snapshot.revision !== result.revision)
      ) {
        delete row.snapshot;
        await write(row);
      }
      return;
    }
    if (offer.settingsReturn) {
      track(EVENTS.PERMISSION_RESULT, foreground, offer, {
        permission: 'notifications',
        prompted: false,
        primed: false,
        raw_authorization: result.access.raw,
        canAskAgain: result.access.canAskAgain,
        granted: result.access.full,
        channel_available: result.access.channel,
      });
      delete offer.settingsReturn;
    }
    if (result.result === 'verified') {
      offer.state = 'enabled';
      offer.everVerified = true;
    }
    if (result.result === 'restricted') offer.state = 'declined';
    delete row.withdrawnAt;
    const verified = result.result === 'verified';
    row.snapshot = verified
      ? { times: result.times, revision: result.revision, at: Date.now() }
      : undefined;
    await write(row);
    track(EVENTS.REVIEW_REMINDER_PLAN_VERIFIED, foreground, offer, {
      $insert_id: randomUUID(),
      result: result.result,
      full_permission: result.access.full,
      channel_available: result.access.channel,
      enabled_preference: result.enabled,
      managed_future_count: result.times.length,
      earliest_trigger_timestamp: result.times[0],
      plan_revision: result.revision,
    });
  });
}
