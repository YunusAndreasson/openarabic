import { ResponsiveSheetScreen } from '@/components/common/ResponsiveSheetScreen';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetHeader, BottomSheetStateHandler, SheetExplainer } from '@/components/common';
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

  // The solid bars need a legend only while there are solid bars to explain —
  // read off the same periods the chart paints them from.
  const hasLiveRun = streakHistory?.streakPeriods.some(period => period.isActive) ?? false;

  return (
    <ResponsiveSheetScreen testID="study-streak-sheet">
      <BottomSheetStateHandler
        isLoading={isStreakLoading}
        isError={isStreakError}
        isEmpty={!streakHistory}
        loadingMessage={STRINGS.LOADING_STREAK}
        errorMessage={STRINGS.FAILED_TO_LOAD_STREAK}
        emptyMessage={STRINGS.STUDY_STREAK_EMPTY_STATE}
      >
        {/* A definition, the same with or without a live run — what every other
            practice sheet's subtitle is. It used to coach ("Keep the momentum
            going" / "Start your practice habit"). */}
        <BottomSheetHeader title={STRINGS.STREAK_LABEL} subtitle={STRINGS.STUDY_STREAK_SUBTITLE} />

        {streakHistory?.metrics && (
          <View style={styles.streakMetricsContainer}>
            <StreakMetrics metrics={streakHistory.metrics} />
          </View>
        )}

        {/* One header per sheet. This was the only practice sheet with two, and
            the second one said "Last 40 days" directly above a chart whose own
            axis already reads "40 days ago … Today" — a title restating the
            drawing under it. What was worth keeping is the sentence that says
            what a bar IS, and that is a closing caption, in the same place and
            the same ink as every other sheet's. */}
        {streakHistory?.dailyActivity && streakHistory?.streakPeriods && (
          <>
            <StreakChart
              dailyActivity={streakHistory.dailyActivity}
              streakPeriods={streakHistory.streakPeriods}
            />
            <SheetExplainer
              text={
                hasLiveRun
                  ? STRINGS.STUDY_STREAK_CHART_CURRENT_RUN
                  : STRINGS.STUDY_STREAK_CHART_DESCRIPTION
              }
            />
          </>
        )}
      </BottomSheetStateHandler>
    </ResponsiveSheetScreen>
  );
}

const styles = StyleSheet.create({
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});
