import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';
import { lightFeedback, successFeedback } from '@/utils/haptics';
import { formatSecondsToClock } from '@/utils/dateTimeUtils';

export interface SleepTimerProps {
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  isTimerActive?: boolean;
  /** Unix timestamp (ms) when timer expires */
  endTime?: number;
  ref?: Ref<SleepTimerHandle>;
}

export interface SleepTimerHandle {
  present: () => void;
  dismiss: () => void;
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
  onTimerSet,
  onTimerCancel,
  isTimerActive = false,
  endTime = 0,
  ref,
}: SleepTimerProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useImperativeHandle(
    ref,
    () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }),
    [],
  );

  const [selectedMinutes, setSelectedMinutes] = useState<number>(DEFAULT_SELECTED_MINUTES);
  const [isPresented, setIsPresented] = useState(false);

  // Local countdown — only ticks when modal is visible and timer is active
  const [displaySeconds, setDisplaySeconds] = useState(() => getRemainingSeconds(endTime));

  useEffect(() => {
    // Resync immediately on endTime/active change so the displayed clock is not
    // stale until the next interval tick. This is a bounded one-shot setState
    // (no loop), not a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplaySeconds(getRemainingSeconds(endTime));

    if (!isTimerActive || !endTime || !isPresented) {
      return;
    }

    const interval = setInterval(() => {
      setDisplaySeconds(getRemainingSeconds(endTime));
    }, COUNTDOWN_INTERVAL);

    return () => clearInterval(interval);
  }, [isTimerActive, endTime, isPresented]);

  const handleSetTimer = () => {
    successFeedback();
    onTimerSet(selectedMinutes);
    bottomSheetRef.current?.dismiss();
  };

  const handleCancelTimer = () => {
    lightFeedback();
    onTimerCancel();
    bottomSheetRef.current?.dismiss();
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
      onChange={index => setIsPresented(index >= 0)}
      backdropComponent={BottomSheetBackdrop}
      containerStyle={styles.modalContainer}
      backgroundStyle={[
        styles.background,
        { backgroundColor: colors.elevation1, shadowColor: colors.shadow },
      ]}
      handleComponent={BrandedBottomSheetHandle}
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
