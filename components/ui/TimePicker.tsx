import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';
import { useBottomSheetVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';

export interface TimePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimeSet: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}

export function TimePicker({
  isVisible,
  onClose,
  onTimeSet,
  initialHour = 12,
  initialMinute = 0,
}: TimePickerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useBottomSheetVisibility(isVisible);

  // Create initial date from hour and minute
  const initialDate = new Date();
  initialDate.setHours(initialHour, initialMinute, 0, 0);

  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Track if bottom sheet is visible to prevent native picker from showing before sheet
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Track bottom sheet visibility to delay native picker render on Android
  // Parent state sync is handled by onClose prop after close animation completes
  const handleChange = useCallback((index: number) => {
    // 0 means sheet is expanded (visible)
    setIsSheetVisible(index === 0);
  }, []);

  const extractTimeAndSet = (date: Date) => {
    const hour = date.getHours();
    const minute = date.getMinutes();
    onTimeSet(hour, minute);
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirm = () => {
    extractTimeAndSet(selectedDate);
    onClose();
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  // Use shared dynamic styles hook for theme-aware styling
  const dynamicStyles = useBottomSheetDynamicStyles();

  // Unified bottom sheet with native picker for both platforms
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      enableDynamicSizing={true}
      onChange={handleChange}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={BottomSheetBackdrop}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
      >
        {/* Time Display */}
        <View style={styles.timeDisplay}>
          <ThemedText
            colorName="subtitleText"
            style={styles.timeText}
            type="heading1"
            weight="bold"
          >
            {formatTime(selectedDate)}
          </ThemedText>
        </View>

        {/* Native Time Picker - Only render when sheet is visible to prevent Android popup */}
        {isSheetVisible && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleDateChange}
              style={styles.picker}
              textColor={colors.text}
              accentColor={colors.tint}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <ThemedButton title={STRINGS.SET_TIME} onPress={handleConfirm} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

TimePicker.displayName = 'TimePicker';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  actions: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  picker: {
    height: MIN_TOUCH_TARGET.LARGE * 4 + LAYOUT.SPACING.LARGE, // Responsive height
    width: '100%',
  },
  pickerContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.LARGE, // 28 + 16 = 44px - consistent large display
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.XXXLARGE, // 28 + 32 = 60px - proportional line height
  },
});
