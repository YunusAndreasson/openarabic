import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Trailing glyph shown only on the active option (e.g. a sort direction). */
  activeIcon?: IoniconName;
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

const ACTIVE_ICON_SIZE = 12;

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
  const colors = useColors();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={[styles.container, style]}
    >
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={
              isActive ? (option.activeAccessibilityLabel ?? option.label) : option.label
            }
            accessibilityState={{ selected: isActive, checked: isActive }}
            hitSlop={LAYOUT.HIT_SLOP.SMALL}
            style={styles.option}
            onPress={() => {
              selectionFeedback();
              onChange(option.value);
            }}
          >
            <ThemedText
              colorName={isActive ? 'text' : 'subtleLabelText'}
              type={isActive ? 'label' : 'caption'}
            >
              {option.label}
            </ThemedText>
            {isActive && option.activeIcon ? (
              <Ionicons
                accessible={false}
                importantForAccessibility="no"
                color={colors.secondaryText}
                name={option.activeIcon}
                size={ACTIVE_ICON_SIZE}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.LARGE,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.HALF_TINY,
  },
});

export const SegmentedControl = memo(SegmentedControlComponent) as typeof SegmentedControlComponent;
