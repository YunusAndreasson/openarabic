import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { DueWordsPrognosisChart } from '@/components/practice/charts/DueWordsPrognosisChart';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { COMMON_BOTTOM_SHEET_PROPS, useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';

interface DueWordsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const SNAP_POINTS = [450]; // Compact height with minimal spacing

export const DueWordsBottomSheet = memo<DueWordsBottomSheetProps>(({ isVisible, onClose }) => {
  const colors = useColors();
  const { user } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Use FSRS queries to get study words data
  const { allWords } = useFSRSQueries({
    userId: user?.id,
    limit: 1000, // Get more words for better forecast accuracy
  });

  // Filter study words for chart (needs all words for forecast calculation)
  const filteredStudyWords = useMemo(() => {
    return allWords?.filter(word => word != null && word.root_id != null) ?? [];
  }, [allWords]);

  // Snap point is static so define outside component
  const snapPoints = SNAP_POINTS;

  // Show/hide modal based on isVisible prop (same pattern as other bottom sheets)
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator]
  );

  // Only render when visible (same pattern as other bottom sheets)
  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
      {...COMMON_BOTTOM_SHEET_PROPS}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold">
            {STRINGS.DUE_WORDS_FORECAST}
          </ThemedText>
        </View>

        {/* Chart Content */}
        <View style={styles.chartContainer}>
          <DueWordsPrognosisChart studyWords={filteredStudyWords} hideTitle={true} />
        </View>

        {/* Educational Explanation */}
        <View style={styles.explanationContainer}>
          <ThemedText style={styles.explanationText} variant="secondary">
            {STRINGS.DUE_WORDS_FORECAST_EXPLANATION}
          </ThemedText>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

DueWordsBottomSheet.displayName = 'DueWordsBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: {
    paddingBottom: LAYOUT.SPACING.MEDIUM, // Reduced bottom padding
  },
  header: LAYOUT.BOTTOM_SHEET.HEADER,
  chartContainer: {
    paddingHorizontal: LAYOUT.SPACING.SMALL, // Reduced from MEDIUM for better alignment
    paddingBottom: LAYOUT.SPACING.TINY, // Minimal space after chart
  },
  explanationContainer: {
    paddingHorizontal: LAYOUT.SPACING.SMALL, // Reduced from MEDIUM for better alignment
    paddingTop: LAYOUT.SPACING.TINY, // Minimal space before text
    paddingBottom: 0, // Remove bottom padding, handled by container
  },
  explanationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    textAlign: 'left',
  },
});
