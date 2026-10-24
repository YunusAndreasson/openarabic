import { Host, Switch } from '@expo/ui/jetpack-compose';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import { useNativeColorScheme } from '@/hooks/theme/useThemeDetection';
import type { ToggleProps } from '@/types/ui/form.types';

export type { ToggleProps } from '@/types/ui/form.types';

/**
 * The Material 3 switch, in the app's colours rather than a tonal palette
 * derived from them. Like the iOS switch (`Toggle.tsx`) it only draws state:
 * the row owns the tap, the haptic and the screen-reader role, so the native
 * view takes no touches (the parent intercepts them) and is hidden from
 * TalkBack.
 */
export function Toggle({ value, testID }: ToggleProps) {
  const colors = useColors();
  // Any role the colours above leave out comes from the host's Material theme,
  // which follows the OS appearance unless told the app's.
  const colorScheme = useNativeColorScheme();

  return (
    <View style={styles.passive} importantForAccessibility="no-hide-descendants" testID={testID}>
      <Host colorScheme={colorScheme} matchContents>
        <Switch
          value={value}
          colors={{
            checkedTrackColor: colors.tint,
            checkedThumbColor: colors.onTint,
            checkedBorderColor: colors.tint,
            uncheckedTrackColor: colors.elevation2,
            uncheckedThumbColor: colors.textTertiary,
            uncheckedBorderColor: colors.border,
          }}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  passive: {
    pointerEvents: 'none',
  },
});
