import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { initialWindowMetrics } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_BUTTON, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { mediumFeedback } from '@/utils/haptics';

const FAB_SIZE = 56;
const BOTTOM_INSET = initialWindowMetrics?.insets.bottom ?? 0;
const FAB_BOTTOM = LAYOUT.BOTTOM_BAR.HEIGHT + BOTTOM_INSET + LAYOUT.SPACING.TINY;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  loading?: boolean;
}

export function FloatingActionButton({
  icon,
  onPress,
  loading,
}: FloatingActionButtonProps): JSX.Element {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(PRESS_ANIMATION_BUTTON);

  const iconColor = colors.onTint;

  return (
    <AnimatedPressable
      onPress={() => {
        mediumFeedback();
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading}
      style={[
        styles.fab,
        animatedStyle,
        {
          backgroundColor: colors.tint,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={LAYOUT.BUTTON.ICON_SIZE.LARGE}
          color={iconColor}
        />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    borderRadius: FAB_SIZE / 2,
    bottom: FAB_BOTTOM,
    height: FAB_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    width: FAB_SIZE,
    zIndex: LAYOUT.Z_INDEX.CARD,
    ...LAYOUT.ELEVATION.MEDIUM,
  },
});
