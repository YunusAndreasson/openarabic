import { Host, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { useCallback } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import { useNativeColorScheme } from '@/hooks/theme/useThemeDetection';
import type { TimePickerProps } from './TimePicker';

export type { TimePickerProps } from './TimePicker';

export function TimePicker({
  isVisible,
  onClose,
  onTimeSet,
  initialHour = 12,
  initialMinute = 0,
}: TimePickerProps) {
  const colors = useColors();
  const colorScheme = useNativeColorScheme();
  const initialDate = new Date();
  initialDate.setHours(initialHour, initialMinute, 0, 0);

  const handleValueChange = useCallback(
    (date: Date) => {
      onTimeSet(date.getHours(), date.getMinutes());
      onClose();
    },
    [onClose, onTimeSet],
  );

  if (!isVisible) return null;

  // The community adapter follows the device theme on Android. Use its native
  // dialog directly so an app-selected theme and accent reach the Compose host.
  return (
    <Host colorScheme={colorScheme} seedColor={colors.tint}>
      <TimePickerDialog
        initialDate={initialDate.toISOString()}
        is24Hour
        onDateSelected={handleValueChange}
        onDismissRequest={onClose}
      />
    </Host>
  );
}

TimePicker.displayName = 'TimePicker';
