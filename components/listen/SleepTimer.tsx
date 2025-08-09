import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

export interface SleepTimerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  remainingTime?: number; // in seconds
  isActive?: boolean;
}

const timerOptions = [5, 10, 15, 30, 45, 60]; // minutes
const DEFAULT_SELECTED_MINUTES = 15; // Pre-select 15 minutes

// Use shared formatter

const SleepTimerComponent = ({
  isVisible,
  onClose,
  onTimerSet,
  onTimerCancel,
  remainingTime = 0,
  isActive = false,
}: SleepTimerProps) => {
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Pre-select 15 minutes as default
  const [selectedMinutes, setSelectedMinutes] = useState<number>(DEFAULT_SELECTED_MINUTES);

  // Configure snap points - dynamic based on active state
  const snapPoints = useMemo(() => {
    // Base height for header + content + padding
    const baseHeight = 120;
    const gridHeight = isActive ? 100 : 180; // Less height when showing active timer
    const buttonHeight = 60;
    const totalHeight = baseHeight + gridHeight + buttonHeight;
    return [Math.min(totalHeight, 450)];
  }, [isActive]);

  // Handle visibility changes - use expand/close like TimePicker
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSetTimer = useCallback(() => {
    onTimerSet(selectedMinutes);
    onClose();
  }, [selectedMinutes, onTimerSet, onClose]);

  const handleCancelTimer = useCallback(() => {
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

  // Memoize dynamic styles to prevent recalculation
  const dynamicStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.elevation1 },
      indicator: { backgroundColor: colors.modalIndicator },
      header: { borderBottomColor: colors.borderOverlay },
    }),
    [colors.elevation1, colors.modalIndicator, colors.borderOverlay]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      activeOffsetY={[-10, 10]}
      onClose={onClose}
      backgroundStyle={[styles.background, dynamicStyles.background]}
      handleIndicatorStyle={[styles.indicator, dynamicStyles.indicator]}
      backdropComponent={renderBackdrop}
      style={{ zIndex: 99999 }}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={styles.headerContent}>
            <ThemedText style={styles.title} type="heading2" weight="bold">
              {STRINGS.SLEEP_TIMER_TITLE}
            </ThemedText>
            <ThemedText style={styles.subtitle} type="body" variant="secondary">
              {isActive && remainingTime > 0
                ? STRINGS.SLEEP_TIMER_AUTOMATIC
                : STRINGS.SLEEP_TIMER_CHOOSE_WHEN}
            </ThemedText>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isActive && remainingTime > 0 ? (
            <View style={styles.activeTimerContainer}>
              <View style={styles.timeDisplay}>
                <ThemedText colorName="tint" style={styles.timeText} type="heading1">
                  {formatTime(remainingTime)}
                </ThemedText>
              </View>
              <ThemedText style={styles.activeDescription} type="body" variant="secondary">
                {STRINGS.REMAINING}
              </ThemedText>
              <ThemedButton
                style={[styles.fullWidthButton, { borderColor: colors.borderOverlay }]}
                title={STRINGS.CANCEL_TIMER}
                variant="outlined"
                onPress={handleCancelTimer}
              />
            </View>
          ) : (
            <>
              <View style={styles.optionsGrid}>
                {timerOptions.map(minutes => (
                  <ThemedButton
                    key={minutes}
                    title={STRINGS.MINUTES.replace('{minutes}', minutes.toString())}
                    variant={selectedMinutes === minutes ? 'filled' : 'outlined'}
                    style={[
                      styles.optionButton,
                      selectedMinutes === minutes
                        ? {
                            backgroundColor: colors.tint,
                            borderColor: colors.tint,
                          }
                        : {
                            borderColor: colors.borderOverlay,
                            backgroundColor: colors.elevation2,
                          },
                    ]}
                    onPress={handleOptionSelect(minutes)}
                  />
                ))}
              </View>

              <ThemedButton
                style={styles.fullWidthButton}
                title={STRINGS.START_TIMER}
                variant="filled"
                onPress={handleSetTimer}
              />
            </>
          )}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

// Simplified memo comparison
const arePropsEqual = (prevProps: SleepTimerProps, nextProps: SleepTimerProps): boolean => {
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isActive === nextProps.isActive &&
    Math.abs((prevProps.remainingTime ?? 0) - (nextProps.remainingTime ?? 0)) <= 1
  );
};

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
    flex: 1,
  },

  header: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  subtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },

  content: {
    padding: LAYOUT.SPACING.LARGE,
  },

  activeTimerContainer: {
    alignItems: 'center',
  },

  timeDisplay: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },

  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.MEDIUM, // 28 + 12 = 40px - consistent display size
    fontVariant: ['tabular-nums'],
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_TIGHT,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.XXXLARGE, // 28 + 32 = 60px - proportional
    textAlign: 'center',
  },

  activeDescription: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL + 2,
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },

  optionButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM + 2,
    paddingVertical: LAYOUT.SPACING.MEDIUM + 2,
    width: `${LAYOUT.WIDTH_RATIOS.THIRD * 100 - 3}%`,
  },

  fullWidthButton: {
    width: '100%',
  },
});

const SleepTimer = memo(SleepTimerComponent, arePropsEqual);

export default SleepTimer;
