import { Redirect } from 'expo-router';

import { DictionaryWordScreen } from '@/components/practice/DictionaryWordScreen';
import { useAuth } from '@/hooks/auth/useAuth';
import { getDictionaryWordRoute } from '@/utils/routeBuilders';
import { useRootIdParam } from '@/utils/routeParams';
import { ROUTE_PATHS } from '@/constants/routes';

export default function PracticeWordScreen() {
  const { user } = useAuth();
  const rootId = useRootIdParam();
  if (!user)
    return <Redirect href={rootId ? getDictionaryWordRoute(rootId) : ROUTE_PATHS.DICTIONARY} />;
  return <DictionaryWordScreen />;
}
