import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

export interface TimePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimeSet: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}

export const TimePicker = memo(
  ({ isVisible, onClose, onTimeSet, initialHour = 12, initialMinute = 0 }: TimePickerProps) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Create initial date from hour and minute
    const initialDate = useMemo(() => {
      const date = new Date();
      date.setHours(initialHour, initialMinute, 0, 0);
      return date;
    }, [initialHour, initialMinute]);

    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [showPicker, setShowPicker] = useState(false);

    // Calculate snap point - use numeric value like SessionTypeModal
    const snapPoints = useMemo(() => [500], []);

    // Show/hide modal based on isVisible prop
    useEffect(() => {
      if (isVisible) {
        setShowPicker(Platform.OS === 'android');
        if (Platform.OS === 'ios') {
          bottomSheetRef.current?.expand();
        }
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);

    const extractTimeAndSet = useCallback(
      (date: Date) => {
        const hour = date.getHours();
        const minute = date.getMinutes();
        onTimeSet(hour, minute);
      },
      [onTimeSet]
    );

    const handleDateChange = useCallback(
      (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {
          setShowPicker(false);

          if (event.type === 'set' && date) {
            setSelectedDate(date);
            extractTimeAndSet(date);
          }
          onClose();
        } else if (date) {
          setSelectedDate(date);
        }
      },
      [extractTimeAndSet, onClose]
    );

    const handleConfirm = useCallback(() => {
      extractTimeAndSet(selectedDate);
      onClose();
    }, [selectedDate, extractTimeAndSet, onClose]);

    const formatTime = useCallback((date: Date) => {
      const hour = date.getHours();
      const minute = date.getMinutes();
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      return `${displayHour}:${displayMinute} ${period}`;
    }, []);

    // Memoize backdrop component to prevent re-renders
    const backdropComponent = useCallback(
      (props: any) => (
        <View
          style={[props.style, [styles.backdrop, { backgroundColor: colors.backdropOverlay }]]}
          onTouchStart={onClose}
          pointerEvents="auto"
        />
      ),
      [colors.backdropOverlay, onClose]
    );

    // Memoize dynamic styles to prevent recalculation
    const dynamicStyles = useMemo(
      () => ({
        bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
      }),
      [colors.elevation1, colors.modalIndicator]
    );

    // Android: Show native picker directly
    if (Platform.OS === 'android' && showPicker) {
      return (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleDateChange}
        />
      );
    }

    // Only render on iOS and when visible
    if (Platform.OS !== 'ios' || !isVisible) {
      return null;
    }

    // iOS: Show bottom sheet with native picker
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag={false}
        enableDynamicSizing={false}
        animateOnMount={true}
        activeOffsetY={[-10, 10]}
        onClose={onClose}
        backgroundStyle={dynamicStyles.bottomSheet}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={backdropComponent}
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

          {/* Native Time Picker */}
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={handleDateChange}
              style={styles.picker}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <ThemedButton title="Set Time" onPress={handleConfirm} />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

TimePicker.displayName = 'TimePicker';

const styles = StyleSheet.create({
  bottomSheet: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  backdrop: {
    // backgroundColor handled dynamically via colors.backdropOverlay
  },
  indicator: {
    width: 32,
    height: 4,
  },
  container: {
    paddingBottom: LAYOUT.SPACING.LARGE,
  },

  actions: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  picker: {
    height: 200,
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
    fontSize: 48,
    lineHeight: 56,
  },
});
