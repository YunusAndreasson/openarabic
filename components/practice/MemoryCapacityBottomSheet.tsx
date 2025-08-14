import { Ionicons } from '@expo/vector-icons';
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
import { calculateWordStates } from '@/utils/memoryCapacityGauge';

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
    // Compute capacity metrics only when needed
    // const { capacityScore } = useMemo(
    //   () => calculateMemoryCapacityMetrics(studyWords),
    //   [studyWords]
    // );

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
      [colors.elevation1, colors.modalIndicator, colors.cardBorder, phaseColor]
    );

    if (!isVisible) return null;

    // Helper percent function removed as unused

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
          {/* Header - neutral title */}
          <View style={styles.header}>
            <ThemedText type="heading2" weight="bold">
              {STRINGS.MEMORY_CAPACITY}
            </ThemedText>
          </View>

          {/* Single, concise explanation */}
          <View style={styles.phaseSection}>
            <ThemedText type="body" style={[styles.phaseCopy, { color: colors.secondaryText }]}>
              {STRINGS.MEMORY_CAPACITY_EXPLANATION}
            </ThemedText>
          </View>

          {/* Subtle divider and tip for affordance */}
          <View style={styles.divider} />
          <View style={styles.tipRow}>
            <View style={styles.tipContent}>
              <Ionicons
                name="bulb"
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={colors.tint}
                style={styles.tipIcon}
              />
              <ThemedText type="caption" colorName="textTertiary">
                {STRINGS.MEMORY_CAPACITY_TIP}
              </ThemedText>
            </View>
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
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
  tipRow: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIcon: {
    marginRight: LAYOUT.SPACING.TINY,
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
