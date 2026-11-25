import { Redirect, useLocalSearchParams } from 'expo-router';

import { getPublicWidgetArticleRoute } from '@/services/widgets/publicArticleRoute';

export default function LegacyFirstPage() {
  const { widgetPosition, widgetWord } = useLocalSearchParams<{
    widgetPosition?: string;
    widgetWord?: string;
  }>();
  return <Redirect href={getPublicWidgetArticleRoute(widgetPosition, widgetWord === 'true')} />;
}
