import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
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
  // Android presents as a modal dialog (`presentation: 'dialog'`, its default).
  // Wrapping that in a BottomSheet (as iOS does) would stack a dialog on a sheet,
  // with a second "Set time" confirm redundant with the dialog's OK — so Android
  // uses the dialog directly. iOS keeps the inline-spinner-in-sheet design.
  if (Platform.OS === 'android') {
    return (
      <AndroidTimePicker
        isVisible={isVisible}
        onClose={onClose}
        onTimeSet={onTimeSet}
        initialHour={initialHour}
        initialMinute={initialMinute}
      />
    );
  }

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

function AndroidTimePicker({
  isVisible,
  onClose,
  onTimeSet,
  initialHour = 12,
  initialMinute = 0,
}: TimePickerProps) {
  const initialDate = new Date();
  initialDate.setHours(initialHour, initialMinute, 0, 0);

  // Confirm and cancel are now separate callbacks, so there is no event.type to
  // branch on: onValueChange fires only on OK, onDismiss only on CANCEL /
  // outside-tap. Both close the picker; only the former persists the new time.
  const handleValueChange = useCallback(
    (_event: unknown, date: Date) => {
      onTimeSet(date.getHours(), date.getMinutes());
      onClose();
    },
    [onClose, onTimeSet],
  );

  if (!isVisible) return null;

  return (
    <DateTimePicker
      value={initialDate}
      mode="time"
      is24Hour
      presentation="dialog"
      onValueChange={handleValueChange}
      onDismiss={onClose}
    />
  );
}

function IosTimePicker({
  isVisible,
  onClose,
  onTimeSet,
  initialHour = 12,
  initialMinute = 0,
}: TimePickerProps) {
  const colors = useColors();
  const isDark = useIsDarkMode();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useBottomSheetVisibility(isVisible);

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

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const dynamicStyles = useBottomSheetDynamicStyles();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      enableDynamicSizing={true}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleComponent={BrandedBottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
      >
        <View style={styles.timeDisplay}>
          <ThemedText colorName="subtitleText" style={styles.timeText} type="heading1">
            {formatTime(selectedDate)}
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
            themeVariant={isDark ? 'dark' : 'light'}
          />
        </View>

        <View style={styles.actions}>
          <ThemedButton title={STRINGS.SET_TIME} onPress={handleConfirm} />
        </View>
      </BottomSheetView>
    </BottomSheet>
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
