import type { ComponentType, FC, ReactNode } from 'react';
import type { AccessibilityRole, AccessibilityState, StyleProp, ViewStyle } from 'react-native';
import { Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { getElevation, type ElevationRole } from '@/constants/elevation';
import { LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_CARD } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import type { PressableLikeProps } from '@/types/ui/base.types';
import type { BaseCardProps, CardElevation, CardSurface } from '@/types/ui/card.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withAlpha } from '@/utils/colorUtils';

// Static constants extracted outside component - zero per-render allocations
const PRESSABLE_STYLE = { flex: 1 } as const;

const ELEVATION_ROLE: Record<CardElevation, ElevationRole> = {
  none: 'NONE',
  hairline: 'HAIRLINE',
  card: 'CARD',
  floating: 'FLOATING',
  modal: 'MODAL',
};

type SurfaceKey = `${CardSurface}:${CardElevation}:${'bordered' | 'plain'}`;

const SURFACE_CACHE = new WeakMap<ThemeColors, Map<SurfaceKey, ViewStyle>>();

/**
 * Background, border and shadow for one (theme, surface, elevation, bordered)
 * combination, resolved once and then handed back by identity.
 *
 * There are thirty combinations per theme and a list screen re-renders through
 * two or three of them, so this is a cache, not a memo: the returned object is
 * the same reference on every render of every card, which keeps the style array
 * cheap to diff no matter how many rows FlashList has recycled.
 */
const getCardSurface = (
  colors: ThemeColors,
  surface: CardSurface,
  elevation: CardElevation,
  bordered: boolean,
): ViewStyle => {
  let byKey = SURFACE_CACHE.get(colors);
  if (!byKey) {
    byKey = new Map<SurfaceKey, ViewStyle>();
    SURFACE_CACHE.set(colors, byKey);
  }

  const key: SurfaceKey = `${surface}:${elevation}:${bordered ? 'bordered' : 'plain'}`;
  const cached = byKey.get(key);
  if (cached) return cached;

  const resolved: ViewStyle = {
    backgroundColor: colors[surface],
    ...getElevation(colors, ELEVATION_ROLE[elevation]),
    ...(bordered && {
      borderWidth: LAYOUT.BORDER.WIDTH.HAIRLINE,
      borderColor: withAlpha(colors.border, LAYOUT.OPACITY.MEDIUM),
    }),
  };

  byKey.set(key, resolved);
  return resolved;
};

interface PressableCardProps {
  cardStyle: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onPress: () => void;
  onPressIn?: () => void;
  disabled: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  PressableComponent: ComponentType<PressableLikeProps>;
}

/**
 * The interactive half, mounted only when there is something to press.
 *
 * It is a separate component so its hooks are a separate component's hooks. The
 * press engine used to run unconditionally in `BaseCard` and then be discarded
 * by the two non-interactive branches, which meant a static row still paid for
 * a shared value, a `useAnimatedStyle` worklet plus its UI-thread mapper, an
 * Android ripple config, and a second theme subscription — per row, in a
 * FlashList.
 */
const PressableCard: FC<PressableCardProps> = ({
  cardStyle,
  contentStyle,
  children,
  onPress,
  onPressIn,
  disabled,
  testID,
  accessibilityLabel,
  // A card you can press is a button. Only OptionCard ever said so; the other
  // eleven pressable cards declared no role at all.
  accessibilityRole = 'button',
  accessibilityState,
  PressableComponent,
}) => {
  // Shared press engine, same as every button. `hapticType` stays 'none' (the
  // hook's default): a card is a navigation surface, and firing a haptic on
  // every list-row tap would be a different app.
  const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
    useButtonPress({
      onPress,
      disabled,
      animationOptions: PRESS_ANIMATION_CARD,
      // A card paints its own opaque background, which would hide a ripple
      // drawn behind it.
      rippleForeground: true,
    });

  const startPress = () => {
    onPressIn?.();
    handlePressIn();
  };

  return (
    <Animated.View style={[cardStyle, animatedStyle]}>
      <PressableComponent
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        disabled={disabled}
        android_ripple={rippleConfig}
        style={PRESSABLE_STYLE}
        onPress={handlePress}
        onPressIn={startPress}
        onPressOut={handlePressOut}
      >
        <View style={contentStyle}>{children}</View>
      </PressableComponent>
    </Animated.View>
  );
};

PressableCard.displayName = 'PressableCard';

export const BaseCard: FC<BaseCardProps> = ({
  children,
  style,
  onPress,
  onPressIn,
  elevation = 'card',
  surface = 'card',
  bordered = false,
  contentStyle,
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  PressableComponent = RNPressable,
}) => {
  const colors = useColors();

  const cardStyle = [
    styles.card,
    getCardSurface(colors, surface, elevation, bordered),
    style,
    disabled && styles.disabled,
  ];

  if (onPress) {
    return (
      <PressableCard
        cardStyle={cardStyle}
        contentStyle={contentStyle}
        onPress={onPress}
        onPressIn={onPressIn}
        disabled={disabled}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        PressableComponent={PressableComponent}
      >
        {children}
      </PressableCard>
    );
  }

  // Non-pressable path: a plain View, no animation and no press engine. The
  // accessibility props are applied here too — they used to land only on the
  // `Pressable`, so a labelled static card announced nothing.
  //
  // `accessible` is what makes that true. Both platforms IGNORE a label on a view
  // that is not itself an accessibility element, so the fix the comment above
  // describes did not actually take effect until this was added. Gated on the
  // label rather than always on: marking every static card accessible would
  // collapse its children into one node app-wide, which is a different change
  // from letting a labelled one speak.
  return (
    <View
      style={cardStyle}
      testID={testID}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
    >
      <View style={contentStyle}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden', // Clip absolute children (progress bars) to border radius
  },
  disabled: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});

BaseCard.displayName = 'BaseCard';
