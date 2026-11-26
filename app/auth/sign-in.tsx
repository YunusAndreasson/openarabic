import { Redirect, useLocalSearchParams } from 'expo-router';

import { getAccountRoute } from '@/utils/routeBuilders';

export default function SignInLink() {
  const { saveIntent } = useLocalSearchParams<{ saveIntent?: string }>();
  return <Redirect href={getAccountRoute(saveIntent)} />;
}
