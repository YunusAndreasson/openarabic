import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GenericBottomSheet } from '@/components/common';
import { StreakChart } from '@/components/library';
import { StreakMetrics } from '@/components/library';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
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

    // Memoize content to prevent unnecessary re-renders
    const content = useMemo(() => {
      if (isStreakLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ThemedText type="body" colorName="text">
              Loading your streak
            </ThemedText>
          </View>
        );
      }

      if (isStreakError) {
        return (
          <View style={styles.errorContainer}>
            <ThemedText type="body" colorName="error">
              Can&apos;t load streak data. Try again
            </ThemedText>
          </View>
        );
      }

      if (streakHistory) {
        const hasActiveStreak = streakHistory.metrics.currentStreak > 0;
        const subtitle = hasActiveStreak
          ? 'Keep up the great momentum'
          : 'Start building your study habit';

        return (
          <>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="heading3" weight="bold" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
                Study streak
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
            <View style={styles.streakMetricsContainer}>
              <StreakMetrics metrics={streakHistory.metrics} />
            </View>

            {/* Streak Chart */}
            <>
              <ThemedText type="heading3" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
                Last 40 days
              </ThemedText>
              <ThemedText
                type="body"
                colorName="textTertiary"
                style={LAYOUT.BOTTOM_SHEET.STYLES.subtitle}
              >
                Each bar shows a study session day
              </ThemedText>
              <StreakChart
                dailyActivity={streakHistory.dailyActivity}
                streakPeriods={streakHistory.streakPeriods}
              />
            </>
          </>
        );
      }

      return (
        <View style={styles.emptyContainer}>
          <ThemedText type="body" colorName="textTertiary">
            Complete study sessions to build your streak
          </ThemedText>
        </View>
      );
    }, [isStreakLoading, isStreakError, streakHistory]);

    return (
      <GenericBottomSheet isVisible={isVisible} onClose={onClose}>
        {content}
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
  // State containers
  loadingContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  errorContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
