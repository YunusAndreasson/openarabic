import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { fsrsQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAndroidBackHandler } from '@/hooks/ui/useAndroidBackHandler';
import {
  confirmFirstGrade,
  leaveFirstReview,
  prepareFirstReview,
  resumeFirstReview,
  type FirstReview,
} from '@/services/firstReview';
import { readerSave } from '@/services/readerSave';
import type { RootId } from '@/types/branded.types';
import { getArticleRoute } from '@/utils/routeBuilders';

export function useFirstReview(owner: string, root: RootId) {
  const cache = useQueryClient();
  const [review, setReview] = useState<FirstReview>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true);
  const mounted = useRef(false);
  const locked = useRef(false);

  async function load() {
    const saved = await resumeFirstReview(owner, root);
    if (!saved) throw new Error('Missing review');
    if (mounted.current) setReview(saved);
    // A process may have stopped between storing the review and closing its save receipt.
    await readerSave.change(saved.id, old =>
      old.owner === owner && (old.phase === 'saved' || old.phase === 'existing') ? null : old,
    );
    if (saved.step === 'writing') return confirmFirstGrade(saved);
    if (!saved.card) return prepareFirstReview(saved);
    return saved;
  }

  async function perform(action: () => Promise<FirstReview>) {
    try {
      const next = await action();
      if (next.completedAt)
        cache.setQueryData(
          fsrsQueries.lastCompletedAtKey(owner),
          Math.max(
            next.completedAt,
            cache.getQueryData<number>(fsrsQueries.lastCompletedAtKey(owner)) ?? 0,
          ),
        );
      if (next.step === 'conflict' || (next.previous && next.previous !== review?.previous))
        void fsrsQueries.invalidateAll(cache, owner);
      if (mounted.current) setReview(next);
    } catch {
      // A rejected device write or late duplicate acknowledgement may leave
      // a more recent attempt on disk than the one currently on screen.
      const saved = await resumeFirstReview(owner, root).catch(() => undefined);
      if (mounted.current) {
        setError(true);
        if (saved) setReview(saved);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function run(action: () => Promise<FirstReview>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(false);
    void perform(action);
  }
  // The route keys this hook by owner and root. A remount reconciles the original operation.
  const restore = useEffectEvent(() => {
    if (locked.current) return;
    locked.current = true;
    void perform(load);
  });
  useEffect(() => {
    mounted.current = true;
    restore();
    return () => {
      mounted.current = false;
    };
  }, []);

  function exit() {
    if (review)
      void leaveFirstReview(review).catch(() => {
        if (mounted.current) setError(true);
      });
    const word = review?.word;
    router.dismissTo(
      word?.source === 'article' && word.articleId
        ? getArticleRoute(word.articleId, { sentenceId: word.sentenceId })
        : ROUTE_PATHS.EXPLORE_TAB,
    );
  }
  useAndroidBackHandler(true, exit);
  return { review, error, busy, run, exit, reload: () => run(load) };
}
