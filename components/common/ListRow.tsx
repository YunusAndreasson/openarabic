import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress, type HapticType } from '@/hooks/ui/useButtonPress';

interface ListRowProps {
  children: ReactNode;
  /** Makes the row pressable. Omit for a static row. */
  onPress?: () => void;
  /**
   * Draw a hairline rule under the row.
   *
   * Rows across the app used three different mechanisms for this — a
   * `ListSeparator`, an inline `borderBottomWidth`, and a `borderColor` threaded
   * through as a prop — so the same visual line came in three weights.
   */
  divider?: boolean;
  /** Vertical breathing room (default: 'MEDIUM'). */
  density?: 'compact' | 'comfortable';
  /**
   * Haptic weight on press. Defaults to 'none' — a row that navigates is not
   * an event. Pass 'selection' for a row that *does* something, especially
   * something destructive.
   */
  hapticType?: HapticType;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
  style?: StyleProp<ViewStyle>;
}

/**
 * A horizontal row of content — label + value, icon + label + chevron, word +
 * meaning + action.
 *
 * Five screens each declared their own version of the same
 * `flexDirection: 'row'` + `alignItems: 'center'` + gap + vertical padding
 * block, and the dictionary, word-detail and revisit screens — three views of
 * the same data — disagreed on all three numbers.
 */
export const ListRow = ({
  children,
  onPress,
  divider = false,
  density = 'comfortable',
  hapticType = 'none',
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
}: ListRowProps) => {
  const colors = useColors();
  const { handlePress, rippleConfig } = useButtonPress({ onPress, hapticType });

  const rowStyle = [
    styles.row,
    density === 'compact' ? styles.compact : styles.comfortable,
    divider && {
      borderBottomWidth: LAYOUT.BORDER.WIDTH.HAIRLINE,
      borderBottomColor: colors.border,
    },
    style,
  ];

  // A static row still announces its label when it has one. `accessible` is
  // what makes that true: a bare `accessibilityLabel` on a View is ignored by
  // both platforms unless the view is an accessibility element, so without it
  // the label was silently dropped — which is exactly what happened to the
  // "no words" phrasing on an empty band row in the practice sheets.
  if (!onPress) {
    return (
      <View
        accessible={accessibilityLabel ? true : undefined}
        accessibilityLabel={accessibilityLabel}
        style={rowStyle}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      android_ripple={rippleConfig}
      style={rowStyle}
      onPress={handlePress}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  comfortable: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  compact: {
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});

ListRow.displayName = 'ListRow';
