import { useQuery } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';

import { fsrsQueries, gated } from '@/constants/queries';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import { useAuth } from '@/hooks/auth/useAuth';
import { setAppBadgeCount } from '@/services/notificationService';
import { useAppSelector } from '@/store/hooks';

/**
 * `undefined` = the count is not knowable yet. Leave the icon alone rather than
 * blanking a number the OS legitimately put there.
 */
function syncBadge(count: number | undefined): void {
  if (count === undefined) return;
  void setAppBadgeCount(count);
}

/**
 * Mirrors the due-words count onto the app icon badge.
 *
 * The badge is SHARED state: the OS writes it too. A delivered smart reminder
 * carries a `badge:` payload, and the headless background task sets it while
 * the app is closed. So this hook keeps no memory of what it last wrote — that
 * memory was the bug. It started at 0 and never read the real badge, so a
 * reminder could set the icon to 9, the app would reopen with a true count of
 * 0, and the "already 0, nothing to do" guard skipped the one write that would
 * have cleared it. The icon then sat at 9 until some *different* non-zero count
 * happened along.
 *
 * It also keeps no memory of whether a write LANDED, because it can't act on
 * one: `setAppBadgeCount` is permission-gated (iOS grants the badge with
 * notification authorization) and reports a rejected write by returning false,
 * having changed nothing. An unauthorized install therefore wears whatever
 * number was last written while it *was* authorized — a stale count no amount
 * of reviewing can move, since only the OS may clear it. The answer is not to
 * track the failures but to re-assert often enough that the first write after
 * authorization returns repairs the icon:
 *
 *   - whenever the count changes,
 *   - on every FRESH READ of it, changed or not (`dataUpdatedAt`) — a review
 *     invalidates the due entry and a resume refetches it, so this is the
 *     ordinary path back from a stale icon,
 *   - the moment reminders are enabled, which is the one place that runs the
 *     OS permission dialog (`useAccountScreen` -> `ensurePermissions`) and so
 *     the first instant a write can land after a stretch of rejected ones,
 *   - and on every resume.
 *
 * `setBadgeCountAsync` is a cheap, idempotent native call, so re-asserting
 * costs nothing worth saving.
 *
 * Reads the SAME due list as the background task and the reminder planner —
 * `fsrsQueries.due(userId)`, no session cooldown — so the icon cannot disagree
 * with the number the next reminder puts there. The preloader already fetches
 * that entry, so this adds no request.
 */
export function useAppBadge(): void {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const remindersEnabled = useAppSelector(state => state.settings.reminderTime.enabled);

  const { data: dueWords, dataUpdatedAt } = useQuery(gated(fsrsQueries.due, user?.id));

  // Auth starts every launch as "loading, not authenticated". Reading that as
  // "signed out, so 0" would wipe a reminder's badge on every cold start —
  // permanently, if the due query then never resolves (offline). Wait it out.
  let badgeCount: number | undefined;
  if (isAuthLoading) {
    badgeCount = undefined;
  } else if (!isAuthenticated) {
    badgeCount = 0;
  } else {
    badgeCount = dueWords?.length; // undefined until the due list first loads
  }

  // `dataUpdatedAt` alongside the count: a refetch that returns the SAME number
  // still has to be written, because the icon may not be showing that number.
  useEffect(() => syncBadge(badgeCount), [badgeCount, dataUpdatedAt]);

  // Non-reactive on purpose — this must fire on the permission moment only, not
  // again on every count change while reminders happen to be on.
  const assertBadge = useEffectEvent(() => syncBadge(badgeCount));
  useEffect(() => {
    if (remindersEnabled) assertBadge();
  }, [remindersEnabled]);

  // A resume is the only moment the icon can be wrong without the count having
  // changed — a reminder delivered while the app was away moved it.
  useResumeFromBackground(() => syncBadge(badgeCount));
}
