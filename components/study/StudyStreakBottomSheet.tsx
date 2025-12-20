import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetStateHandler, GenericBottomSheet } from '@/components/common';
import { StreakChart, StreakMetrics } from '@/components/library';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyStreakHistory } from '@/hooks/study/useStudyStreakHistory';

interface StudyStreakBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const StudyStreakBottomSheet = memo<StudyStreakBottomSheetProps>(
  ({ isVisible, onClose }) => {
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
      <GenericBottomSheet isVisible={isVisible} onClose={onClose}>
        <BottomSheetStateHandler
          isLoading={isStreakLoading}
          isError={isStreakError}
          isEmpty={!streakHistory}
          loadingMessage={STRINGS.LOADING_STREAK}
          errorMessage={STRINGS.FAILED_TO_LOAD_STREAK}
          emptyMessage={STRINGS.STUDY_STREAK_EMPTY_STATE}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="heading3" weight="bold" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
              {STRINGS.STUDY_STREAK_TITLE}
            </ThemedText>
            <ThemedText
              type="body"
              colorName="textTertiary"
              style={LAYOUT.BOTTOM_SHEET.STYLES.subtitle}
            >
              {subtitle}
            </ThemedText>
          </View>

          {/* Streak Metrics */}
          {streakHistory?.metrics && (
            <View style={styles.streakMetricsContainer}>
              <StreakMetrics metrics={streakHistory.metrics} />
            </View>
          )}

          {/* Streak Chart */}
          {streakHistory?.dailyActivity && streakHistory?.streakPeriods && (
            <>
              <ThemedText type="heading3" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
                {STRINGS.STUDY_STREAK_CHART_TITLE}
              </ThemedText>
              <ThemedText
                type="body"
                colorName="textTertiary"
                style={LAYOUT.BOTTOM_SHEET.STYLES.subtitle}
              >
                {STRINGS.STUDY_STREAK_CHART_DESCRIPTION}
              </ThemedText>
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
  // Section 1: Header (highest hierarchy)
  header: {
    ...LAYOUT.BOTTOM_SHEET.HEADER,
    marginBottom: LAYOUT.SPACING.LARGE, // 16px - tighter grouping with metric cards
  },
  // Section 2: Streak Metrics (secondary hierarchy)
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE, // 24px - clear section separation
  },
});
