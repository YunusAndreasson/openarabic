import type { FC, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import type { SolidColorName } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface BadgeProps {
  children: ReactNode;
  /** Text colour. Defaults to the app's secondary text. */
  colorName?: SolidColorName;
  /** Surface the pill sits on. Defaults to `elevation2`. */
  backgroundColorName?: SolidColorName;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small count/status pill.
 *
 * Four of these existed independently, and one of them — the explore filter's
 * count — derived its corner radius as `MIN_TOUCH_TARGET.SMALL / 2` while the
 * other three used `BORDER_RADIUS.PILL`, so the same element was visibly a
 * different shape depending on the screen. `PILL` wins: it stays a capsule at
 * any height.
 */
export const Badge: FC<BadgeProps> = ({
  children,
  colorName = 'secondaryText',
  backgroundColorName = 'elevation2',
  style,
}) => {
  const colors = useColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors[backgroundColorName] }, style]}>
      <ThemedText colorName={colorName} numberOfLines={1} type="caption">
        {children}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.HALF_TINY,
  },
});

Badge.displayName = 'Badge';
