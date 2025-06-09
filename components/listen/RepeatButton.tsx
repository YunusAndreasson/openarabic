import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useToggleAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';

interface RepeatButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

const RepeatButton: React.FC<RepeatButtonProps> = ({ enabled, onToggle }) => {
  const colors = useColors();

  // Use toggle animation for container state changes (scale + opacity)
  const { containerAnimatedStyle } = useToggleAnimation(enabled, 0.02); // Small scale change

  // Use transform animation for icon rotation
  const { animatedStyle: iconRotationStyle, startAnimation: startRotation } = useTransformAnimation(
    {
      type: 'rotate',
      initialValue: 0,
      targetValue: 360,
      duration: 400,
    }
  );

  // Trigger rotation animation when enabled state changes
  React.useEffect(() => {
    if (enabled) {
      startRotation();
    }
  }, [enabled, startRotation]);

  const handlePress = () => {
    onToggle();
  };

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
    <TouchableOpacity style={styles.touchable} onPress={handlePress}>
      <Animated.View style={[styles.container, containerStyle, containerAnimatedStyle]}>
        <View style={styles.content}>
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
          >
            Repeat
          </ThemedText>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    ...LAYOUT.SHADOW.SUBTLE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET.SIZE,
    minWidth: 100,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.2,
  },
  touchable: {
    alignSelf: 'center',
  },
});

export default RepeatButton;
