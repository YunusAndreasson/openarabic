import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface RepeatButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

const RepeatButton: React.FC<RepeatButtonProps> = ({ enabled, onToggle }) => {
  const colors = useColors();

  const handlePress = () => {
    onToggle();
  };

  // Animated styles for the button container - using more subtle colors
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(enabled ? colors.elevation2 : colors.elevation1, {
        duration: 200,
      }),
      borderColor: withTiming(enabled ? colors.borderOverlay : colors.borderOverlay, {
        duration: 200,
      }),
      opacity: withTiming(enabled ? 1 : 0.7, { duration: 200 }),
      transform: [
        {
          scale: withSpring(enabled ? 1.02 : 1, {
            damping: 15,
            stiffness: 300,
          }),
        },
      ],
    };
  }, [enabled, colors]);

  // Animated styles for the icon
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withSpring(enabled ? '360deg' : '0deg', {
            damping: 12,
            stiffness: 200,
          }),
        },
      ],
    };
  }, [enabled]);

  return (
    <TouchableOpacity
      style={styles.touchable}
      onPress={handlePress}
    >
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
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
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderWidth: 1,
    elevation: 1,
    minHeight: MIN_TOUCH_TARGET.SIZE,
    minWidth: 100,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM + 2,
    paddingVertical: LAYOUT.SPACING.SMALL + 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
