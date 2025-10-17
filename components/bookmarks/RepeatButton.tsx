import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, type ComponentProps, type FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { AudioAction } from '@/types/enums';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple, COMMON_STYLES } from '@/utils/layoutUtils';

interface RepeatButtonProps
  extends Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon' | 'onPress'> {
  enabled: boolean;
  onToggle: () => void;
}

export const RepeatButton: FC<RepeatButtonProps> = ({ enabled, onToggle, ...rest }) => {
  const colors = useColors();

  // Simple icon rotation animation
  const { animatedStyle: iconRotationStyle, startAnimation: startRotation } = useTransformAnimation(
    {
      type: 'rotate',
      initialValue: 0,
      targetValue: 360,
      duration: TIMING_CONFIG.SLOW.duration,
    }
  );

  // Trigger rotation animation when enabled state changes
  useEffect(() => {
    if (enabled) {
      startRotation();
    }
  }, [enabled, startRotation]);

  const handlePress = useCallback(() => {
    selectionFeedback();
    onToggle();
  }, [onToggle]);

  // Memoize background colors to prevent unnecessary re-renders
  const containerStyle = useMemo(
    () => ({
      backgroundColor: enabled ? colors.elevation2 : colors.elevation1,
      borderColor: colors.borderOverlay,
      opacity: enabled ? 1 : 0.7,
    }),
    [enabled, colors.elevation1, colors.elevation2, colors.borderOverlay]
  );

  return (
    <Pressable
      style={[styles.container, containerStyle]}
      onPress={handlePress}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      android_ripple={createAndroidRipple(colors)}
      {...rest}
    >
      <Animated.View style={[styles.iconContainer, iconRotationStyle]}>
        <Ionicons
          color={enabled ? colors.tint : colors.interactiveSecondary}
          name="repeat"
          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
        />
      </Animated.View>

      <ThemedText
        style={[styles.label, { color: enabled ? colors.tint : colors.interactiveSecondary }]}
        variant={enabled ? undefined : 'subtle'}
        skipDefaultColor={true}
      >
        {AudioAction.REPEAT}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    ...LAYOUT.ELEVATION.SUBTLE,
    ...COMMON_STYLES.centeredRow,
    ...COMMON_STYLES.roundedMedium,
    alignSelf: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: MIN_TOUCH_TARGET.LARGE * 2 + LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    ...COMMON_STYLES.centeredRow,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

