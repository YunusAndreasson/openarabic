import { fsrsGradeMutation, studyWordToggleMutation } from '@/utils/mutationDefaults';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { widgetBridge } from '@/services/widgets/native';
import { observePlacement, widgetInstallTime } from '@/services/widgets/placement';
import { invalidateWordWidget, publishDeck, widgetOwner } from '@/services/widgets/publish';
import { isKnownOffline } from '@/utils/network';

/** Only an acknowledged full query can certify the widget's schedule. Optimistic cache writes
 * retire that certificate; its original check date never advances on a cache read. */
export function useWordWidgetSync() {
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
      detachMutations = cache.getMutationCache().subscribe(() => {
        const next = mutating();
        if (next && !pending) invalidateWordWidget(owner, installed, 'Checking');
        if (!next && pending) void fetchDeck();
        pending = next;
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
      sub.remove();
    };
  }, [cache, owner, isLoading]);
}
