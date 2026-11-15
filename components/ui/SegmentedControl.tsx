import { Icon, type IconName } from '@/components/ui/Icon';
import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Trailing glyph shown only on the active option (e.g. a sort direction). */
  activeIcon?: IconName;
  /** Full spoken label for the selected option, including any icon meaning. */
  activeAccessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  /** Called on every press, including a press on the already-active option —
   *  callers that toggle a direction on re-select depend on that. */
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Sort by". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A row of mutually exclusive text options — the app's "pick one of N" inline
 * control, as used by the dictionary's sort bar.
 *
 * Text-only rather than the boxed iOS segmented control: it sits inline above a
 * list as chrome, and a filled track there reads as a second toolbar. The
 * active option carries weight and full-strength text colour; the rest recede.
 *
 * Announces itself as a radio group, which the hand-rolled version it replaces
 * did not do at all.
 */
function SegmentedControlComponent<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={[styles.container, style]}
    >
      {options.map(option => (
        <SegmentOption
          key={option.value}
          option={option}
          isActive={option.value === value}
          onChange={onChange}
        />
      ))}
    </View>
  );
}

function SegmentOption<T extends string>({
  option,
  isActive,
  onChange,
}: {
  option: SegmentedControlOption<T>;
  isActive: boolean;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  const { handlePress } = useButtonPress({
    onPress: () => onChange(option.value),
    hapticType: 'selection',
  });

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={
        isActive ? (option.activeAccessibilityLabel ?? option.label) : option.label
      }
      accessibilityState={{ selected: isActive, checked: isActive }}
      hitSlop={LAYOUT.HIT_SLOP.SMALL}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <ThemedText
        colorName={isActive ? 'text' : 'subtleLabelText'}
        type={isActive ? 'label' : 'caption'}
      >
        {option.label}
      </ThemedText>
      {isActive && option.activeIcon ? (
        <Icon
          accessible={false}
          importantForAccessibility="no"
          color={colors.secondaryText}
          name={option.activeIcon}
          size={LAYOUT.SPACING.MEDIUM}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.LARGE,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET.SMALL,
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.HALF_TINY,
  },
});

export const SegmentedControl = memo(SegmentedControlComponent) as typeof SegmentedControlComponent;
