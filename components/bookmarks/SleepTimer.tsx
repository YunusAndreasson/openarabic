import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { SleepTimerAction } from '@/types/enums';
import { useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';
import { lightFeedback, successFeedback } from '@/utils/haptics';
import { formatSecondsToClock } from '@/utils/dateTimeUtils';

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

export function SleepTimer({
  isVisible,
  onClose,
  onTimerSet,
  onTimerCancel,
  isTimerActive = false,
  remainingTime = 0,
}: SleepTimerProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const colors = useColors();

  // Pre-select 15 minutes as default
  const [selectedMinutes, setSelectedMinutes] = useState<number>(DEFAULT_SELECTED_MINUTES);

  // Configure snap points - fixed values for better performance
  const snapPoints = [
    isTimerActive
      ? LAYOUT.BOTTOM_SHEET.SNAP_POINTS.TIMER_COLLAPSED
      : LAYOUT.BOTTOM_SHEET.SNAP_POINTS.TIMER_EXPANDED,
  ];

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isVisible]);

  // Handle sheet position changes - sync parent state when dismissed via gesture
  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSetTimer = () => {
    successFeedback();
    onTimerSet(selectedMinutes);
    onClose();
  };

  const handleCancelTimer = () => {
    lightFeedback();
    onTimerCancel();
    onClose();
  };

  const handleOptionSelect = (minutes: number) => () => setSelectedMinutes(minutes);

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      enableOverDrag={false}
      onChange={handleChange}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.background,
        { backgroundColor: colors.elevation1, shadowColor: colors.shadow },
      ]}
      handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.modalIndicator }]}
    >
      <BottomSheetView style={styles.container}>
        {/* Header - always show title */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold">
            {STRINGS.SLEEP_TIMER}
          </ThemedText>
        </View>

        {!isTimerActive ? (
          <>
            <View style={styles.optionsGrid}>
              {timerOptions.map(minutes => (
                <View key={minutes} style={styles.optionContainer}>
                  <ThemedButton
                    title={`${minutes} min`}
                    variant={selectedMinutes === minutes ? 'filled' : 'outlined'}
                    onPress={handleOptionSelect(minutes)}
                    style={styles.optionButton}
                    uppercase={false}
                  />
                </View>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <ThemedButton
                style={styles.fullWidthButton}
                title={SleepTimerAction.SET}
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
            <View style={styles.buttonContainer}>
              <ThemedButton title={SleepTimerAction.CANCEL} onPress={handleCancelTimer} />
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    ...LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
    ...LAYOUT.ELEVATION.LARGE,
  },
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: {
    ...LAYOUT.BOTTOM_SHEET.STYLES.container,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
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
    // +2px micro-adjustment for visual balance in timer option buttons
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

  buttonContainer: {
    width: '100%',
  },
});

SleepTimer.displayName = 'SleepTimer';
