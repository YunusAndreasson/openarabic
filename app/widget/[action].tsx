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
import type { ArticleId, RootId } from '@/types/branded.types';
import { getArticleRoute, getWordDetailRoute } from '@/utils/routeBuilders';
import { getPublicWidgetArticleRoute } from '@/services/widgets/publicArticleRoute';
import { parsePositiveIntParam } from '@/utils/routeParams';

export default function WordWidgetLink() {
  const { action, v, p, r, a, s } = useLocalSearchParams<{
    action: string;
    v?: string;
    p?: string;
    r?: string;
    a?: string;
    s?: string;
  }>();
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
  const privateRoute = !!owner && (action === 'practice' || !!v);
  const word = action === 'word';
  const passage = action === 'passage';
  const targeted = word || passage;
  const verified = !!(targeted && owner && v && widgetBridge?.matchesOwner(owner, v));
  useEffect(() => {
    if (isLoading || action !== 'practice' || !privateRoute || !owner) return;
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
  }, [action, isLoading, privateRoute, owner, cache, v]);
  const destination =
    targeted || !privateRoute || resolved?.stale
      ? action === 'practice'
        ? ROUTE_PATHS.PRACTICE_TAB
        : ROUTE_PATHS.EXPLORE_TAB
      : resolved?.due
        ? ROUTE_PATHS.REVIEW
        : ROUTE_PATHS.PRACTICE_TAB;
  const ready =
    !isLoading &&
    (action !== 'practice' ||
      !privateRoute ||
      (resolved?.owner === owner && resolved.generation === v));
  const rootId = verified ? parsePositiveIntParam<RootId>(r) : undefined;
  const articleId = verified ? parsePositiveIntParam<ArticleId>(a) : undefined;
  const target =
    word && rootId
      ? getWordDetailRoute(rootId)
      : passage && articleId
        ? getArticleRoute(articleId, {
            sentenceId: parsePositiveIntParam(s),
            disableAutoScroll: true,
            source: 'word',
          })
        : targeted && (!v || verified) && typeof p === 'string' && /^\d+\.\d+$/.test(p)
          ? getPublicWidgetArticleRoute(p, word)
          : undefined;
  useEffect(() => {
    if (ready && (targeted || action === 'read' || action === 'practice') && !logged.current) {
      logged.current = true;
      void analytics.track(ANALYTICS_EVENTS.WIDGET_OPENED, {
        destination: target?.pathname ?? destination,
        platform: Platform.OS,
        edition:
          verified || (action === 'practice' && privateRoute && !resolved?.stale)
            ? 'personal'
            : 'public',
        foreground_session_id: currentReminderSession(),
      });
    }
  }, [action, ready, destination, targeted, target, verified, privateRoute, resolved?.stale]);
  return ready ? (
    <Redirect
      href={
        target ??
        (destination === ROUTE_PATHS.REVIEW
          ? { pathname: destination, params: { source: 'widget' } }
          : destination)
      }
    />
  ) : null;
}
