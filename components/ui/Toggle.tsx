import { Host, Toggle as NativeToggle } from '@expo/ui/swift-ui';
import { labelsHidden, tint, toggleStyle } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import type { ToggleProps } from '@/types/ui/form.types';

/**
 * The on/off switch at the end of a settings row: UIKit's own switch, through
 * SwiftUI, so it has the system size, thumb and iOS 26 look. Android draws the
 * Material 3 switch (`Toggle.android.tsx`).
 *
 * It only draws state. The row owns the tap, the haptic and the screen-reader
 * role (`SettingsCard`), so the native view takes no touches and is hidden from
 * accessibility: a switch that handled its own tap inside a pressable row would
 * see the same touch twice and flip back.
 */
export function Toggle({ value, testID }: ToggleProps) {
  const colors = useColors();

  return (
    <View
      style={styles.passive}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Host matchContents>
        <NativeToggle
          isOn={value}
          modifiers={[toggleStyle('switch'), labelsHidden(), tint(colors.tint)]}
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
