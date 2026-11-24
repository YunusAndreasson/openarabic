import { useEffect, useState } from 'react';
import { usePendingReaderSave, reportSaveError } from '@/hooks/onboarding/useReaderSave';
import { canResumeReaderSave, readerSave } from '@/services/readerSave';
import { resumeFirstReview } from '@/services/firstReview';
import type { RootId } from '@/types/branded.types';
import { getArticleRoute, getSingleWordReviewRoute } from '@/utils/routeBuilders';
import { Redirect } from 'expo-router';
import type { JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAppSelector } from '@/store/hooks';

/**
 * Index screen - redirects to the right root for the current auth state.
 *
 * The target must agree with the <Stack.Protected> guards in _layout.tsx:
 * redirecting into a guarded route the user cannot enter leaves the router
 * parked on `/`, which renders nothing at all.
 */
export default function Index(): JSX.Element | null {
  const { session } = useAuth();

  const returning = useAppSelector(
    state => state.firstPage.returningInstall || state.firstPage.browsed,
  );
  const pending = usePendingReaderSave();
  const owner = session?.user?.id;
  const [resumed, setResumed] = useState<{ owner: string; root?: RootId; saveId?: string }>();
  useEffect(() => {
    if (!owner) return;
    let active = true;
    void resumeFirstReview(owner)
      .then(review => {
        if (active) setResumed({ owner, root: review?.word.rootId, saveId: review?.id });
      })
      .catch(() => {
        if (active) setResumed({ owner });
      });
    return () => {
      active = false;
    };
  }, [owner]);
  useEffect(() => {
    if (owner && pending && !canResumeReaderSave(pending, owner)) {
      void readerSave.change(pending.id, () => null).catch(reportSaveError);
    }
  }, [pending, owner]);
  if (pending === undefined || (owner && resumed?.owner !== owner)) return null;
  if (
    owner &&
    resumed?.owner === owner &&
    resumed.root &&
    (!pending || !canResumeReaderSave(pending, owner) || pending.id === resumed.saveId)
  )
    return <Redirect href={getSingleWordReviewRoute(resumed.root)} />;
  if (pending && (!pending.owner || owner) && canResumeReaderSave(pending, owner)) {
    const { word } = pending;
    if (word.source === 'article' && word.articleId)
      return <Redirect href={getArticleRoute(word.articleId, { sentenceId: word.sentenceId })} />;
    return <Redirect href={ROUTE_PATHS.FIRST_PAGE} />;
  }
  return (
    <Redirect href={session || returning ? ROUTE_PATHS.EXPLORE_TAB : ROUTE_PATHS.FIRST_PAGE} />
  );
}
