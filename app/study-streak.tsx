import type { JSX } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetHeader, BottomSheetStateHandler, SheetScreen } from '@/components/common';
import { StreakChart, StreakMetrics } from '@/components/explore';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyStreakHistory } from '@/hooks/practice/useStudyStreakHistory';

export default function StudyStreakScreen(): JSX.Element {
  const {
    streakHistory,
    isLoading: isStreakLoading,
    isError: isStreakError,
  } = useStudyStreakHistory();

  const subtitle = useMemo(() => {
    if (!streakHistory?.metrics) {
      return STRINGS.STUDY_STREAK_INACTIVE_SUBTITLE;
    }
    const hasActiveStreak = streakHistory.metrics.currentStreak > 0;
    return hasActiveStreak
      ? STRINGS.STUDY_STREAK_ACTIVE_SUBTITLE
      : STRINGS.STUDY_STREAK_INACTIVE_SUBTITLE;
  }, [streakHistory]);

  return (
    <SheetScreen>
      <BottomSheetStateHandler
        isLoading={isStreakLoading}
        isError={isStreakError}
        isEmpty={!streakHistory}
        loadingMessage={STRINGS.LOADING_STREAK}
        errorMessage={STRINGS.FAILED_TO_LOAD_STREAK}
        emptyMessage={STRINGS.STUDY_STREAK_EMPTY_STATE}
      >
        <BottomSheetHeader title={STRINGS.STREAK_LABEL} subtitle={subtitle} />

        {streakHistory?.metrics && (
          <View style={styles.streakMetricsContainer}>
            <StreakMetrics metrics={streakHistory.metrics} />
          </View>
        )}

        {streakHistory?.dailyActivity && streakHistory?.streakPeriods && (
          <>
            <BottomSheetHeader
              title={STRINGS.STUDY_STREAK_CHART_TITLE}
              subtitle={STRINGS.STUDY_STREAK_CHART_DESCRIPTION}
            />
            <StreakChart
              dailyActivity={streakHistory.dailyActivity}
              streakPeriods={streakHistory.streakPeriods}
            />
          </>
        )}
      </BottomSheetStateHandler>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});
