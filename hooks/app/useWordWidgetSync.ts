import { fsrsGradeMutation, studyWordToggleMutation } from '@/utils/mutationDefaults';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { fsrsQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { widgetBridge } from '@/services/widgets/native';
import { observePlacement, widgetInstallTime } from '@/services/widgets/placement';
import { invalidateWordWidget, publishDeck, widgetOwner } from '@/services/widgets/publish';
import { isKnownOffline } from '@/utils/network';

interface WidgetNavigation {
  addListener(event: 'state', listener: () => void): () => void;
  getCurrentRoute(): { name: string } | undefined;
  isReady(): boolean;
}
const REVIEW_SCREEN = ROUTE_PATHS.REVIEW.slice(1);

/** Only an acknowledged full query can certify the widget's schedule. Optimistic cache writes
 * retire that certificate; its original check date never advances on a cache read. */
export function useWordWidgetSync(navigation: WidgetNavigation) {
  const { user, isLoading } = useAuth();
  const owner = user?.id ?? '';
  const cache = useQueryClient();
  useEffect(() => {
    if (!widgetBridge || isLoading) return;
    const lifetime = new AbortController();
    const active = () => !lifetime.signal.aborted;
    let stop: (() => void) | undefined;
    let seq = 0;
    let detachMutations: (() => void) | undefined;
    let detachNavigation: (() => void) | undefined;
    let flushDeck: (() => void) | undefined;
    const reviewingInForeground = () =>
      AppState.currentState !== 'background' &&
      navigation.isReady() &&
      navigation.getCurrentRoute()?.name === REVIEW_SCREEN;

    async function setup() {
      const installed = await widgetInstallTime();
      if (!active()) return;
      widgetOwner(owner, installed);
      if (!owner) return;
      const options = fsrsQueries.all(owner);
      const same = (keys: readonly unknown[]) =>
        keys.length === options.queryKey.length && keys.every((k, i) => k === options.queryKey[i]);
      const fetchDeck = () => cache.query({ ...options, staleTime: 0 }).catch(() => undefined);
      const mutating = () =>
        cache.isMutating({ mutationKey: fsrsGradeMutation.mutationKey }) +
        cache.isMutating({ mutationKey: studyWordToggleMutation.mutationKey });
      let pending = mutating();
      let needsRefresh = false;
      const refresh = () => {
        if (!active() || !needsRefresh || mutating()) return;
        needsRefresh = false;
        void fetchDeck();
      };
      flushDeck = refresh;
      detachNavigation = navigation.addListener('state', () => {
        if (!reviewingInForeground()) refresh();
      });
      detachMutations = cache.getMutationCache().subscribe(() => {
        const next = mutating();
        if (next && !pending) invalidateWordWidget(owner, installed, 'Checking');
        const settled = !next && pending;
        pending = next;
        if (settled) {
          // The full-deck read and widget publication compete with the next
          // card. Keep the last checked face while grades land, then refresh
          // once the learner can leave Review or return to the launcher.
          needsRefresh = true;
          if (!reviewingInForeground()) refresh();
        }
      });
      stop = cache.getQueryCache().subscribe(event => {
        if (event.type !== 'updated' || !same(event.query.queryKey as readonly unknown[])) return;
        const action = event.action;
        if (action.type === 'success' && !action.manual) {
          ++seq;
          const words = cache.getQueryData(options.queryKey);
          if (words && !mutating())
            void publishDeck(
              owner,
              words,
              event.query.state.dataUpdatedAt,
              installed,
              cache.getQueryData<number>(fsrsQueries.lastCompletedAtKey(owner)),
            ).catch(() => undefined);
        } else if (action.type === 'invalidate' || action.type === 'success') {
          ++seq;
          invalidateWordWidget(owner, installed, 'Checking');
        } else if (action.type === 'error') {
          const version = ++seq;
          void isKnownOffline()
            .then(offline => {
              if (active() && version === seq)
                invalidateWordWidget(owner, installed, offline ? 'Offline copy' : 'Sync failed');
            })
            .catch(() => undefined);
        }
      });
      if (await isKnownOffline()) {
        if (active()) invalidateWordWidget(owner, installed, 'Offline copy');
      } else if (active()) await fetchDeck();
    }
    void setup().catch(() => undefined);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') flushDeck?.();
      if (state !== 'active') return;
      void observePlacement(currentReminderSession()).catch(() => undefined);
      void widgetInstallTime()
        .then(async first => {
          if (!active()) return;
          widgetOwner(owner, first);
          if (owner) await cache.query({ ...fsrsQueries.all(owner), staleTime: 0 });
        })
        .catch(() => undefined);
    });
    if (AppState.currentState === 'active')
      void observePlacement(currentReminderSession()).catch(() => undefined);
    return () => {
      lifetime.abort();
      stop?.();
      detachMutations?.();
      detachNavigation?.();
      sub.remove();
    };
  }, [cache, owner, isLoading, navigation]);
}
