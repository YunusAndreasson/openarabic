import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback, successFeedback } from '@/utils/haptics';
import { formatSecondsToClock } from '@/utils/time';

export interface SleepTimerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  isTimerActive?: boolean;
  remainingTime?: number;
}

const timerOptions = [5, 10, 15, 30, 45, 60]; // minutes
const DEFAULT_SELECTED_MINUTES = 15; // Pre-select 15 minutes

const SleepTimerComponent = ({
  isVisible,
  onClose,
  onTimerSet,
  onTimerCancel,
  isTimerActive = false,
  remainingTime = 0,
}: SleepTimerProps) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colors = useColors();

  // Pre-select 15 minutes as default
  const [selectedMinutes, setSelectedMinutes] = useState<number>(DEFAULT_SELECTED_MINUTES);

  // Configure snap points - fixed values for better performance
  const snapPoints = useMemo(() => [isTimerActive ? 280 : 380], [isTimerActive]);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSetTimer = useCallback(() => {
    successFeedback();
    onTimerSet(selectedMinutes);
    onClose();
  }, [selectedMinutes, onTimerSet, onClose]);

  const handleCancelTimer = useCallback(() => {
    lightFeedback();
    onTimerCancel();
    onClose();
  }, [onTimerCancel, onClose]);

  const handleOptionSelect = useCallback(
    (minutes: number) => () => setSelectedMinutes(minutes),
    []
  );

  // Use built-in backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
    ),
    [onClose]
  );

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose={true}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      style={styles.modalStyle}
      backgroundStyle={[styles.background, { backgroundColor: colors.elevation1 }]}
      handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.modalIndicator }]}
    >
      <BottomSheetView style={styles.container}>
        {/* Header - always show title */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold">
            Sleep Timer
          </ThemedText>
        </View>

        {!isTimerActive ? (
          <>
            <View style={styles.optionsGrid}>
              {timerOptions.map(minutes => (
                <View key={minutes} style={styles.optionContainer}>
                  <ThemedButton
                    title={`${minutes}m`}
                    variant={selectedMinutes === minutes ? 'filled' : 'outlined'}
                    onPress={handleOptionSelect(minutes)}
                    style={styles.optionButton}
                  />
                </View>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <ThemedButton
                style={styles.fullWidthButton}
                title="Start timer"
                variant="filled"
                onPress={handleSetTimer}
              />
            </View>
          </>
        ) : (
          <View style={styles.activeTimerContainer}>
            <View style={styles.timeDisplay}>
              <ThemedText colorName="tint" style={styles.timeText} type="heading1">
                {formatSecondsToClock(remainingTime)}
              </ThemedText>
            </View>
            <ThemedText style={styles.activeDescription} type="body" variant="secondary">
              Time remaining
            </ThemedText>
            <View style={styles.buttonContainer}>
              <ThemedButton title="Stop timer" variant="filled" onPress={handleCancelTimer} />
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

// Memo comparison - include timer state for proper re-rendering
const arePropsEqual = (prevProps: SleepTimerProps, nextProps: SleepTimerProps): boolean =>
  prevProps.isVisible === nextProps.isVisible &&
  prevProps.isTimerActive === nextProps.isTimerActive &&
  prevProps.remainingTime === nextProps.remainingTime;

const styles = StyleSheet.create({
  background: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    // Dynamic styling applied via colors.modalIndicator in component
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  modalStyle: {
    zIndex: 99999,
  },

  header: LAYOUT.BOTTOM_SHEET.HEADER,

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },

  optionContainer: {
    width: '50%',
    paddingHorizontal: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
  },

  optionButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM + 2,
    paddingVertical: LAYOUT.SPACING.MEDIUM + 2,
    width: '100%',
  },

  fullWidthButton: {
    width: '100%',
  },

  activeTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },

  timeDisplay: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  timeText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.5,
  },

  activeDescription: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  buttonContainer: {
    alignSelf: 'center',
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
});

const SleepTimer = memo(SleepTimerComponent, arePropsEqual);

export default SleepTimer;
