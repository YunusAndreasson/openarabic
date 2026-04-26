import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_BUTTON, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback } from '@/utils/haptics';

const FAB_SIZE = 56;
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
  const insets = useSafeAreaInsets();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(PRESS_ANIMATION_BUTTON);

  const iconColor = colors.onTint;
  // FAB sits inside a tab screen whose content area is already offset above
  // the native tab bar, so insets.bottom + a small gap is the right offset on
  // every device — no per-platform math.
  const fabBottom = insets.bottom + LAYOUT.SPACING.TINY;

  return (
    <AnimatedPressable
      onPress={() => {
        lightFeedback();
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading}
      style={[
        styles.fab,
        animatedStyle,
        {
          bottom: fabBottom,
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
    height: FAB_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    width: FAB_SIZE,
    zIndex: LAYOUT.Z_INDEX.CARD,
    ...LAYOUT.ELEVATION.MEDIUM,
  },
});
