import { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BottomSheetHeader,
  BottomSheetStateHandler,
  GenericBottomSheet,
  type GenericBottomSheetHandle,
} from '@/components/common';
import { StreakChart, StreakMetrics } from '@/components/explore';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyStreakHistory } from '@/hooks/practice/useStudyStreakHistory';

export const StudyStreakBottomSheet = forwardRef<GenericBottomSheetHandle>(
  function StudyStreakBottomSheet(_props, ref) {
    const {
      streakHistory,
      isLoading: isStreakLoading,
      isError: isStreakError,
    } = useStudyStreakHistory();

    // Only calculate subtitle when streakHistory exists to avoid null access
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
      <GenericBottomSheet ref={ref}>
        <BottomSheetStateHandler
          isLoading={isStreakLoading}
          isError={isStreakError}
          isEmpty={!streakHistory}
          loadingMessage={STRINGS.LOADING_STREAK}
          errorMessage={STRINGS.FAILED_TO_LOAD_STREAK}
          emptyMessage={STRINGS.STUDY_STREAK_EMPTY_STATE}
        >
          <BottomSheetHeader title={STRINGS.STREAK_LABEL} subtitle={subtitle} />

          {/* Streak Metrics */}
          {streakHistory?.metrics && (
            <View style={styles.streakMetricsContainer}>
              <StreakMetrics metrics={streakHistory.metrics} />
            </View>
          )}

          {/* Streak Chart */}
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
      </GenericBottomSheet>
    );
  },
);

StudyStreakBottomSheet.displayName = 'StudyStreakBottomSheet';

const styles = StyleSheet.create({
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});
