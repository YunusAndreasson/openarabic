import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { LAYOUT } from '@/constants/layout';
import { fsrsQueries } from '@/constants/queries';
import { getPracticeReviewRoute } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { mediumFeedback } from '@/utils/haptics';

/**
 * Start Review header button for Practice tab
 * Navigates to vocabulary review when tapped
 * Only visible when there are due words
 */
export const StartReviewButton = memo(function StartReviewButton() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check for due words from cache
  const dueWordsCount = useMemo(() => {
    if (!user?.id) return 0;
    const cached = queryClient.getQueryData<StudyWord[]>(
      fsrsQueries.due(user.id).queryKey,
    );
    return cached?.length ?? 0;
  }, [user?.id, queryClient]);

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
    />
  );
});

/**
 * Combined header buttons for Practice tab (Dictionary + Review)
 * Review button on right (primary action, closest to thumb)
 */
export const PracticeHeaderButtons = memo(function PracticeHeaderButtons({
  DictionaryComponent,
}: {
  DictionaryComponent: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      {DictionaryComponent}
      <StartReviewButton />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
});
