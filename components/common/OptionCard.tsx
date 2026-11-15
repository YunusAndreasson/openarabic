import { BaseCard } from '@/components/common/BaseCard';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface OptionCardProps {
  children: ReactNode;
  selected: boolean;
  onPress: () => void;
  /** Spoken name — include the subtitle, since selection is the whole point. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  /** Padding and layout inside the touch target. */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A one-of-N choice. The shared mark communicates selection without relying
 * on colour; padding belongs inside the pressable so the whole card responds.
 */
export const OptionCard = ({
  children,
  selected,
  onPress,
  accessibilityLabel,
  style,
  contentStyle,
}: OptionCardProps) => {
  const colors = useColors();

  return (
    <BaseCard
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      elevation="none"
      contentStyle={[styles.content, contentStyle]}
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
      <View style={styles.body}>{children}</View>
      <Icon
        accessible={false}
        importantForAccessibility="no"
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        color={selected ? colors.tint : colors.secondaryText}
        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
      />
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  content: {
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
});

OptionCard.displayName = 'OptionCard';
