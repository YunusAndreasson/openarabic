import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useBottomSheetModalVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';
import { lightFeedback, successFeedback } from '@/utils/haptics';
import { formatSecondsToClock } from '@/utils/dateTimeUtils';

export interface SleepTimerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  isTimerActive?: boolean;
  /** Unix timestamp (ms) when timer expires */
  endTime?: number;
}

const timerOptions = [5, 10, 15, 30, 45, 60]; // minutes
const DEFAULT_SELECTED_MINUTES = 15;
const COUNTDOWN_INTERVAL = 1000;

/**
 * Derives remaining seconds from an end timestamp.
 * Only called inside this component — no global re-renders.
 */
function getRemainingSeconds(endTime: number): number {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

export function SleepTimer({
  isVisible,
  onClose,
  onTimerSet,
  onTimerCancel,
  isTimerActive = false,
  endTime = 0,
}: SleepTimerProps) {
  const bottomSheetRef = useBottomSheetModalVisibility(isVisible);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(DEFAULT_SELECTED_MINUTES);

  // Local countdown — only ticks when modal is visible and timer is active
  const [displaySeconds, setDisplaySeconds] = useState(() => getRemainingSeconds(endTime));

  useEffect(() => {
    if (!isTimerActive || !endTime || !isVisible) {
      setDisplaySeconds(getRemainingSeconds(endTime));
      return;
    }

    // Sync immediately then tick every second
    setDisplaySeconds(getRemainingSeconds(endTime));
    const interval = setInterval(() => {
      setDisplaySeconds(getRemainingSeconds(endTime));
    }, COUNTDOWN_INTERVAL);

    return () => clearInterval(interval);
  }, [isTimerActive, endTime, isVisible]);

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

  const handleOptionSelect = useCallback(
    (minutes: number) => () => setSelectedMinutes(minutes),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      {...COMMON_BOTTOM_SHEET_MODAL_PROPS}
      enableDynamicSizing={true}
      onDismiss={onClose}
      backdropComponent={BottomSheetBackdrop}
      containerStyle={styles.modalContainer}
      backgroundStyle={[
        styles.background,
        { backgroundColor: colors.elevation1, shadowColor: colors.shadow },
      ]}
      handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.modalIndicator }]}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
      >
        {/* Header */}
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
                title={STRINGS.SET_TIMER}
                onPress={handleSetTimer}
              />
            </View>
          </>
        ) : (
          <View style={styles.activeTimerContainer}>
            <View style={styles.timeDisplay}>
              <ThemedText colorName="tint" style={styles.timeText} type="heading1">
                {formatSecondsToClock(displaySeconds)}
              </ThemedText>
            </View>
            <View style={styles.buttonContainer}>
              <ThemedButton title={STRINGS.CANCEL} onPress={handleCancelTimer} />
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    zIndex: LAYOUT.Z_INDEX.MODAL,
  },
  background: {
    ...LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
    ...LAYOUT.ELEVATION.LARGE,
  },
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: {
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
