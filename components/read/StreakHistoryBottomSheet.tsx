import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { StreakChart } from '@/components/home/StreakChart';
import { StreakMetrics } from '@/components/home/StreakMetrics';
import { LAYOUT } from '@/constants/layout';
import { useStreakHistory } from '@/hooks/articles/useStreakHistory';
import { useColors } from '@/hooks/theme/useColors';

interface StreakHistoryBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const SNAP_POINTS = [380]; // Compact height for better mobile experience

export const StreakHistoryBottomSheet = memo<StreakHistoryBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { streakHistory, isLoading, isError } = useStreakHistory({ enabled: isVisible });

    // Show/hide modal based on isVisible prop
    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);

    // Use built-in backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={onClose}
        />
      ),
      [onClose]
    );

    const dynamicStyles = useMemo(
      () => ({
        bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
      }),
      [colors.elevation1, colors.modalIndicator]
    );

    // Only render when visible
    if (!isVisible) {
      return null;
    }

    // Loading state
    if (isLoading) {
      return (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={SNAP_POINTS}
          enablePanDownToClose
          enableOverDrag={false}
          enableDynamicSizing={false}
          animateOnMount={true}
          activeOffsetY={[-10, 10]}
          onClose={onClose}
          backgroundStyle={dynamicStyles.bottomSheet}
          handleIndicatorStyle={dynamicStyles.indicator}
          backdropComponent={renderBackdrop}
        >
          <BottomSheetView style={styles.container}>
            <View style={styles.header}>
              <ThemedText type="heading2" weight="bold">
                Reading Streak
              </ThemedText>
            </View>
            <View style={styles.loadingContainer}>
              <ThemedText type="body" colorName="textTertiary">
                Loading your streak history...
              </ThemedText>
            </View>
          </BottomSheetView>
        </BottomSheet>
      );
    }

    // Error state
    if (isError || !streakHistory) {
      return (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={SNAP_POINTS}
          enablePanDownToClose
          enableOverDrag={false}
          enableDynamicSizing={false}
          animateOnMount={true}
          activeOffsetY={[-10, 10]}
          onClose={onClose}
          backgroundStyle={dynamicStyles.bottomSheet}
          handleIndicatorStyle={dynamicStyles.indicator}
          backdropComponent={renderBackdrop}
        >
          <BottomSheetView style={styles.container}>
            <View style={styles.header}>
              <ThemedText type="heading2" weight="bold">
                Reading Streak
              </ThemedText>
            </View>
            <View style={styles.errorContainer}>
              <ThemedText type="body" colorName="textTertiary">
                Unable to load streak history. Please try again.
              </ThemedText>
            </View>
          </BottomSheetView>
        </BottomSheet>
      );
    }

    // Success state with data
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        enableOverDrag={false}
        enableDynamicSizing={false}
        animateOnMount={true}
        activeOffsetY={[-10, 10]}
        onClose={onClose}
        backgroundStyle={dynamicStyles.bottomSheet}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="heading2" weight="bold">
                Reading Streak
              </ThemedText>
              <ThemedText type="caption" colorName="textTertiary" style={styles.subtitle}>
                Your daily reading journey over the past 30 days
              </ThemedText>
            </View>

            {/* Metrics Section */}
            <StreakMetrics metrics={streakHistory.metrics} />

            {/* Chart Section */}
            <View style={styles.chartSection}>
              <View style={styles.chartHeader}>
                <ThemedText type="body" weight="semibold" colorName="text">
                  Daily Activity
                </ThemedText>
                <ThemedText type="caption" colorName="textTertiary">
                  Orange bars show streak periods
                </ThemedText>
              </View>
              <StreakChart
                dailyActivity={streakHistory.dailyActivity}
                streakPeriods={streakHistory.streakPeriods}
              />
            </View>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

StreakHistoryBottomSheet.displayName = 'StreakHistoryBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    // Styling handled via dynamicStyles
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  header: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  chartSection: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  chartHeader: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.SMALL,
    alignItems: 'center',
  },
});
