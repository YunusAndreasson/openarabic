import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, type ComponentProps, type FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ROTATION_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

interface RepeatButtonProps
  extends Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon' | 'onPress'> {
  enabled: boolean;
  onToggle: () => void;
}

const RepeatButton: FC<RepeatButtonProps> = ({ enabled, onToggle, ...rest }) => {
  const colors = useColors();

  // Simple icon rotation animation
  const { animatedStyle: iconRotationStyle, startAnimation: startRotation } = useTransformAnimation(
    {
      type: 'rotate',
      initialValue: 0,
      targetValue: 360,
      duration: ROTATION_ANIMATION_DURATION,
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
      android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.MEDIUM / 2 }}
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
        {STRINGS.REPEAT}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    ...LAYOUT.ELEVATION.SUBTLE,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: MIN_TOUCH_TARGET.LARGE * 2 + LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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

export default RepeatButton;
