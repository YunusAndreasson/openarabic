import { BrandedBottomSheet } from '@/components/ui/BrandedBottomSheet';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useNativeColorScheme } from '@/hooks/theme/useThemeDetection';
import { format24HourTime } from '@/utils/dateTimeUtils';

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
  return (
    <IosTimePicker
      isVisible={isVisible}
      onClose={onClose}
      onTimeSet={onTimeSet}
      initialHour={initialHour}
      initialMinute={initialMinute}
    />
  );
}

TimePicker.displayName = 'TimePicker';

function IosTimePicker({
  isVisible,
  onClose,
  onTimeSet,
  initialHour = 12,
  initialMinute = 0,
}: TimePickerProps) {
  const colors = useColors();
  const colorScheme = useNativeColorScheme();
  const insets = useSafeAreaInsets();

  const initialDate = new Date();
  initialDate.setHours(initialHour, initialMinute, 0, 0);

  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleDateChange = (_event: unknown, date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    onTimeSet(selectedDate.getHours(), selectedDate.getMinutes());
    onClose();
  };

  return (
    <BrandedBottomSheet isVisible={isVisible} onClose={onClose}>
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
      >
        <View style={styles.timeDisplay}>
          <ThemedText colorName="subtitleText" style={styles.timeText} type="heading1">
            {format24HourTime(selectedDate.getHours(), selectedDate.getMinutes())}
          </ThemedText>
        </View>

        <View style={styles.pickerContainer}>
          {/* No textColor equivalent in @expo/ui — themeVariant carries the same
              intent, pinning the wheel to the app's theme rather than the
              system's (the two diverge whenever the user forces a theme). */}
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="spinner"
            onValueChange={handleDateChange}
            style={styles.picker}
            accentColor={colors.tint}
            themeVariant={colorScheme}
          />
        </View>

        <View style={styles.actions}>
          <ThemedButton title={STRINGS.SET_TIME} onPress={handleConfirm} />
        </View>
      </BottomSheetView>
    </BrandedBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  actions: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  picker: {
    height: MIN_TOUCH_TARGET.LARGE * 4 + LAYOUT.SPACING.LARGE,
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.XXXLARGE,
  },
});
