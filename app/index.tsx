import { Redirect } from 'expo-router';

import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePendingReaderSave } from '@/hooks/onboarding/useReaderSave';
import { canResumeReaderSave } from '@/services/readerSave';
import { getArticleRoute } from '@/utils/routeBuilders';

export default function Index() {
  const { user } = useAuth();
  const pending = usePendingReaderSave();

  if (pending === undefined) return null;
  if (pending?.word.articleId && canResumeReaderSave(pending, user?.id)) {
    return (
      <Redirect
        href={getArticleRoute(pending.word.articleId, { sentenceId: pending.word.sentenceId })}
      />
    );
  }
  return <Redirect href={ROUTE_PATHS.EXPLORE_TAB} />;
}
