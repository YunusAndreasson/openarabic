import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';

export interface TimePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimeSet: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}

const SNAP_POINTS = [500];

export function TimePicker({
  isVisible,
  onClose,
  onTimeSet,
  initialHour = 12,
  initialMinute = 0,
}: TimePickerProps) {
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Create initial date from hour and minute
  const initialDate = new Date();
  initialDate.setHours(initialHour, initialMinute, 0, 0);

  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Track if bottom sheet is visible to prevent native picker from showing before sheet
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Show/hide modal based on isVisible prop - unified for both platforms
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Track bottom sheet visibility to delay native picker render on Android
  const handleChange = useCallback(
    (index: number) => {
      // 0 means sheet is expanded (visible)
      setIsSheetVisible(index === 0);

      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

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

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  const dynamicStyles = {
    bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
    indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
  };

  // Unified bottom sheet with native picker for both platforms
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      animateOnMount={true}
      activeOffsetY={[-10, 10]}
      onChange={handleChange}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.container}>
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
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: LAYOUT.BOTTOM_SHEET.STYLES.container,

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
