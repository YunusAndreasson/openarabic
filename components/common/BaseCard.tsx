import { type FC, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_CARD } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import type { BaseCardProps } from '@/types/ui/card.types';

// Static constants extracted outside component - zero per-render allocations
const PRESSABLE_STYLE = { flex: 1 } as const;

const SHADOW_LEVEL_MAP = {
  subtle: 'SUBTLE',
  small: 'SMALL',
  medium: 'MEDIUM',
  large: 'LARGE',
} as const;

export const BaseCard: FC<BaseCardProps> = ({
  children,
  style,
  onPress,
  onPressIn,
  onLongPress,
  loading = false,
  shadowSize = 'medium',
  contentStyle,
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

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

  const handlePressInWithCallback = useMemo(() => {
    if (!onPressIn) return handlePressIn;
    return () => {
      onPressIn();
      handlePressIn();
    };
  }, [onPressIn, handlePressIn]);

  // Memoize card style - flat return avoids extra object allocation
  const cardStyle = useMemo(() => {
    const shadowStyles =
      shadowSize !== 'none' ? getThemeAwareElevation(SHADOW_LEVEL_MAP[shadowSize], isDarkMode) : {};

    return [
      styles.card,
      { backgroundColor: colors.card },
      shadowStyles,
      shadowSize !== 'none' && { shadowColor: colors.shadow },
      style,
      disabled && { opacity: LAYOUT.OPACITY.MEDIUM },
    ];
  }, [colors.card, colors.shadow, isDarkMode, shadowSize, style, disabled]);

  // Content wrapper — View acts as layout boundary between flex:1 Pressable and card content
  const content = <View style={contentStyle}>{children}</View>;

  // Non-pressable paths use plain View (no animation overhead)
  if (loading) {
    return <View style={cardStyle} testID={testID} />;
  }

  if (!onPress && !onLongPress) {
    return (
      <View style={cardStyle} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Animated.View style={[cardStyle, animatedStyle]}>
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        disabled={disabled}
        android_ripple={rippleConfig}
        style={PRESSABLE_STYLE}
        onPress={handlePress}
        onPressIn={handlePressInWithCallback}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden', // Clip absolute children (progress bars) to border radius
  },
});

BaseCard.displayName = 'BaseCard';
