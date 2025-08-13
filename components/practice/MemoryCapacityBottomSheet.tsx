import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useChartColors } from '@charts/chartColors';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { calculateMemoryCapacityMetrics, calculateWordStates } from '@/utils/memoryCapacityGauge';

interface MemoryCapacityBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  studyWords: StudyWord[];
}

const SNAP_POINTS = [300];

export const MemoryCapacityBottomSheet = memo<MemoryCapacityBottomSheetProps>(
  ({ isVisible, onClose, studyWords }) => {
    const colors = useColors();
    const chartColors = useChartColors();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    const { dueWords, strugglingWords } = useMemo(
      () => calculateWordStates(studyWords),
      [studyWords]
    );
    const { capacityScore } = useMemo(
      () => calculateMemoryCapacityMetrics(studyWords),
      [studyWords]
    );

    const totalWords = studyWords.length;
    const reviewedWords = useMemo(
      () => studyWords.filter(w => w.fsrs_last_review != null && (w.fsrs_reps ?? 0) > 0).length,
      [studyWords]
    );

    // Phase determination
    const phase: 'red' | 'orange' | 'green' = useMemo(() => {
      if (dueWords > 0) return 'red';
      if (strugglingWords > 0) return 'orange';
      return 'green';
    }, [dueWords, strugglingWords]);

    // Phase color mapping (matches gauge colors)
    const phaseColor = useMemo(() => {
      if (phase === 'red') return chartColors.performance.poor;
      if (phase === 'orange') return chartColors.performance.moderate;
      return chartColors.performance.excellent;
    }, [
      phase,
      chartColors.performance.poor,
      chartColors.performance.moderate,
      chartColors.performance.excellent,
    ]);

    // Show/hide based on isVisible using Modal to ensure overlay above content
    useEffect(() => {
      if (isVisible) bottomSheetRef.current?.present();
      else bottomSheetRef.current?.dismiss();
    }, [isVisible]);

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
        divider: [styles.divider, { backgroundColor: colors.cardBorder }],
        phaseDot: [styles.phaseDot, { backgroundColor: phaseColor }],
      }),
      [colors.elevation1, colors.modalIndicator, colors.cardBorder, chartColors, phaseColor]
    );

    if (!isVisible) return null;

    const percent = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        enableOverDrag={false}
        enableDynamicSizing={false}
        animateOnMount
        activeOffsetY={[-10, 10]}
        onDismiss={onClose}
        backgroundStyle={dynamicStyles.bottomSheet}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.container}>
          {/* Header - show current capacity label in phase color */}
          <View style={styles.header}>
            <ThemedText type="heading2" weight="bold" style={{ color: phaseColor }}>
              {phase === 'red' && STRINGS.MEMORY_CAPACITY_LOW}
              {phase === 'orange' && STRINGS.MEMORY_CAPACITY_MEDIUM}
              {phase === 'green' && STRINGS.MEMORY_CAPACITY_HIGH}
            </ThemedText>
          </View>

          {/* Explanation - concise, action-oriented */}
          <View style={styles.phaseSection}>
            <ThemedText type="body" style={[styles.phaseCopy, { color: colors.secondaryText }]}>
              {phase === 'red' && STRINGS.PHASE_RECOMMENDATION_RED}
              {phase === 'orange' && STRINGS.PHASE_RECOMMENDATION_ORANGE}
              {phase === 'green' && STRINGS.PHASE_RECOMMENDATION_GREEN}
            </ThemedText>
          </View>

          {/* Single-line contextual stat when helpful */}
          {phase !== 'green' && (
            <View style={styles.statRow}>
              <ThemedText type="caption" colorName="textTertiary">
                {phase === 'red'
                  ? STRINGS.DUE_TODAY_LABEL.replace('{count}', String(dueWords))
                  : STRINGS.STRUGGLING_COUNT_LABEL.replace('{count}', String(strugglingWords))}
              </ThemedText>
            </View>
          )}

          {/* Brief FSRS context inside the sheet (no extra navigation) */}
          <View style={styles.explainerRow}>
            <ThemedText type="caption" colorName="textTertiary">
              {STRINGS.CAPACITY_SRS_EXPLAINER}
            </ThemedText>
          </View>

          {/* No extra bullets to keep copy concise */}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

MemoryCapacityBottomSheet.displayName = 'MemoryCapacityBottomSheet';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  bottomSheet: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginVertical: LAYOUT.SPACING.SMALL,
  },
  header: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  subtitle: {
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
    marginTop: LAYOUT.SPACING.TINY,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  phaseRow: {},
  phaseDot: {},
  divider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    opacity: LAYOUT.OPACITY.MEDIUM,
    width: '100%',
    marginVertical: LAYOUT.SPACING.SMALL,
  },
  phaseSection: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  phaseTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.SLIGHT_NEGATIVE,
  },
  phaseCopy: {
    marginTop: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
  },
  list: {
    marginTop: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  bullet: {},
  statRow: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  explainerRow: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});

export default MemoryCapacityBottomSheet;
