import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
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
  // @react-native-community/datetimepicker always presents as a modal AlertDialog
  // on Android regardless of `display`. Wrapping it in a BottomSheet (as iOS does)
  // produces a dialog AND a sheet stacked on top of each other, with a second
  // "Set time" confirm button that's redundant with the dialog's OK. Use the
  // native dialog directly on Android — its event.type ('set' | 'dismissed')
  // drives onTimeSet / onClose. iOS keeps the inline-spinner-in-sheet design.
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

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      // Android fires once per interaction. event.type is 'set' on OK,
      // 'dismissed' on CANCEL / outside-tap. Either way we close the picker;
      // only 'set' with a valid date persists the new time.
      if (event.type === 'set' && date) {
        onTimeSet(date.getHours(), date.getMinutes());
      }
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
      display="spinner"
      // this one callback into onValueChange/onDismiss/onNeutralButtonPress; migrating needs
      // the picker's dismiss-vs-confirm behaviour re-verified on both platforms.
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- see note above
      onChange={handleChange}
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
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useBottomSheetVisibility(isVisible);

  const initialDate = new Date();
  initialDate.setHours(initialHour, initialMinute, 0, 0);

  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
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
          <ThemedText
            colorName="subtitleText"
            style={styles.timeText}
            type="heading1"
            weight="bold"
          >
            {formatTime(selectedDate)}
          </ThemedText>
        </View>

        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="time"
            is24Hour
            display="spinner"
            // this one callback into onValueChange/onDismiss/onNeutralButtonPress; migrating needs
            // the picker's dismiss-vs-confirm behaviour re-verified on both platforms.
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- see note above
            onChange={handleDateChange}
            style={styles.picker}
            textColor={colors.text}
            accentColor={colors.tint}
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
