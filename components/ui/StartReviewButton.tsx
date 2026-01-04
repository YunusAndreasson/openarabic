import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { LAYOUT } from '@/constants/layout';
import { fsrsQueries } from '@/constants/queries';
import { getPracticeReviewRoute } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { mediumFeedback } from '@/utils/haptics';

/**
 * Start Review header button for Practice tab
 * Navigates to vocabulary review when tapped
 * Only visible when there are due words
 */
export const StartReviewButton = memo(function StartReviewButton({
  withMargin = false,
}: {
  withMargin?: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // Subscribe to cache updates - doesn't fetch, just watches for changes
  const { data: dueWords = [] } = useQuery({
    ...fsrsQueries.due(user?.id ?? ''),
    enabled: !!user?.id,
    staleTime: Infinity, // Never refetch - just subscribe to cache
  });

  const dueWordsCount = dueWords.length;

  const handleStartReview = useCallback(() => {
    if (!user) return;
    mediumFeedback();
    router.push(getPracticeReviewRoute());
  }, [user, router]);

  // Don't render if no due words
  if (dueWordsCount === 0) return null;

  return (
    <HeaderIconButton
      iconName="flash"
      onPress={handleStartReview}
      iconColor={colors.tint}
      backgroundColor={colors.transparent}
      testID="start-review-button"
      style={withMargin ? styles.withMargin : undefined}
    />
  );
});

/**
 * Combined header buttons for Practice tab (Dictionary + Review)
 * Uses Fragment to let iOS render separate glass containers for each button
 */
export const PracticeHeaderButtons = memo(function PracticeHeaderButtons({
  DictionaryComponent,
}: {
  DictionaryComponent: React.ReactNode;
}) {
  return (
    <>
      {DictionaryComponent}
      <StartReviewButton withMargin />
    </>
  );
});

const styles = StyleSheet.create({
  withMargin: {
    marginLeft: LAYOUT.SPACING.MEDIUM, // 12px gap between buttons
  },
});
