import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fsrsQueries, gated } from '@/constants/queries';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import { useAuth } from '@/hooks/auth/useAuth';
import { setAppBadgeCount } from '@/services/notificationService';

/**
 * `undefined` = the count is not known yet (cold start, offline). Leave the
 * icon alone rather than blanking a number the OS legitimately put there.
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
 * `setBadgeCountAsync` is a cheap, idempotent native call that reports false by
 * itself when badge permission is missing, so there is nothing worth caching
 * and no permission to pre-check: just re-assert the count whenever it changes,
 * and on every resume.
 *
 * Reads the SAME due list as the background task and the reminder planner —
 * `fsrsQueries.due(userId)`, no session cooldown — so the icon cannot disagree
 * with the number the next reminder puts there. The preloader already fetches
 * that entry, so this adds no request.
 */
export function useAppBadge(): void {
  const { user, isAuthenticated } = useAuth();

  const { data: dueWords } = useQuery(gated(fsrsQueries.due, user?.id));

  const badgeCount = isAuthenticated ? dueWords?.length : 0;

  useEffect(() => syncBadge(badgeCount), [badgeCount]);

  // A resume is the only moment the icon can be wrong without the count having
  // changed — a reminder delivered while the app was away moved it.
  useResumeFromBackground(() => syncBadge(badgeCount));
}
