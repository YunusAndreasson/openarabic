import { Ionicons } from '@expo/vector-icons';
import { useMemo, useEffect, useCallback, type FC, type ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ROTATION_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

interface RepeatButtonProps
  extends Omit<
    BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>,
    'icon' | 'onPress'
  > {
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
    <TouchableOpacity
      style={[styles.container, containerStyle]}
      onPress={handlePress}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      {...rest}
    >
      <Animated.View style={[styles.iconContainer, iconRotationStyle]}>
        <Ionicons
          color={enabled ? colors.tint : colors.interactiveSecondary}
          name="repeat"
          size={20}
        />
      </Animated.View>

      <ThemedText
        style={[styles.label, { color: enabled ? colors.tint : colors.interactiveSecondary }]}
        variant={enabled ? undefined : 'subtle'}
        skipDefaultColor={true}
      >
        {STRINGS.REPEAT}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    ...LAYOUT.ELEVATION.SUBTLE,
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: 100,
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
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default RepeatButton;
