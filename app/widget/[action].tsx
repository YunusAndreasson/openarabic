import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { useEffect, useRef, useState } from 'react';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { fsrsQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { widgetBridge } from '@/services/widgets/native';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { filterDueWords } from '@/utils/newWordPacing';
import { readSmartReminderPrefs } from '@/utils/smartReminderPrefs';

export default function WordWidgetLink() {
  const { action, v } = useLocalSearchParams<{ action: string; v?: string }>();
  const { user, isLoading } = useAuth();
  const cache = useQueryClient();
  const owner = user?.id;
  const [resolved, setResolved] = useState<{
    owner: string;
    generation?: string;
    due: boolean;
    stale?: boolean;
  }>();
  const logged = useRef(false);
  const privateRoute = action === 'practice' && !!owner;
  useEffect(() => {
    if (isLoading || !privateRoute || !owner) return;
    let live = true;
    async function resolve(account: string) {
      if (!v || !widgetBridge?.matchesOwner(account, v))
        return { owner: account, due: false, stale: true };
      const [words, prefs] = await Promise.all([
        cache.query({
          ...fsrsQueries.all(account),
          staleTime: 0,
          retry: false,
          networkMode: 'always',
        }),
        readSmartReminderPrefs(),
      ]);
      return {
        owner: account,
        due:
          filterDueWords(words, {
            nowMs: Date.now(),
            lastCompletedAt:
              cache.getQueryData<number>(fsrsQueries.lastCompletedAtKey(account)) ??
              (prefs?.owner === account ? prefs.lastSessionCompletedAt : undefined),
          }).length > 0,
      };
    }
    void resolve(owner)
      .then(result => {
        if (live) setResolved({ ...result, generation: v });
      })
      .catch(() => {
        if (live) setResolved({ owner, due: false, generation: v });
      });
    return () => {
      live = false;
    };
  }, [isLoading, privateRoute, owner, cache, v]);
  const destination =
    !privateRoute || resolved?.stale
      ? ROUTE_PATHS.FIRST_PAGE
      : resolved?.due
        ? ROUTE_PATHS.REVIEW
        : ROUTE_PATHS.PRACTICE_TAB;
  const ready =
    !isLoading && (!privateRoute || (resolved?.owner === owner && resolved.generation === v));
  useEffect(() => {
    if (ready && (action === 'read' || action === 'practice') && !logged.current) {
      logged.current = true;
      void analytics.track(ANALYTICS_EVENTS.WIDGET_OPENED, {
        destination,
        platform: Platform.OS,
        edition: privateRoute && !resolved?.stale ? 'personal' : 'public',
        foreground_session_id: currentReminderSession(),
      });
    }
  }, [action, ready, destination, privateRoute, resolved?.stale]);
  return ready ? (
    <Redirect
      href={
        destination === ROUTE_PATHS.REVIEW
          ? { pathname: destination, params: { source: 'widget' } }
          : destination
      }
    />
  ) : null;
}
