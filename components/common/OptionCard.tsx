import { BaseCard } from '@/components/common/BaseCard';
import type { FC, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface OptionCardProps {
  children: ReactNode;
  selected: boolean;
  onPress: () => void;
  /** Spoken name — include the subtitle, since selection is the whole point. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A selectable card in a one-of-N list — a theme, an Arabic typeface.
 *
 * The settings picker and the font selector each built this from `BaseCard`
 * with the same selected/unselected border-and-fill logic, differing only in
 * the *unselected* surface (`elevation2` vs `card`). That difference was not a
 * decision, and it made the same control read as two different components
 * depending on which screen you opened. `elevation2` wins: these lists appear
 * inside sheets, where `card` is barely distinguishable from the sheet itself.
 */
export const OptionCard: FC<OptionCardProps> = ({
  children,
  selected,
  onPress,
  accessibilityLabel,
  style,
}) => {
  const colors = useColors();

  return (
    <BaseCard
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      shadowSize="small"
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.tintBackground : colors.elevation2,
          borderColor: selected ? colors.tint : colors.borderOverlay,
        },
        style,
      ]}
      onPress={onPress}
    >
      {children}
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
});

OptionCard.displayName = 'OptionCard';
