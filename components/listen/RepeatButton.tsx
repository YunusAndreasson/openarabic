import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

interface RepeatButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

const RepeatButton: React.FC<RepeatButtonProps> = ({ enabled, onToggle }) => {
  const colors = useColors();

  const handlePress = () => {
    lightFeedback();
    onToggle();
  };

  // Animated styles for the button container
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(enabled ? colors.repeatActive + '15' : colors.elevation2, {
        duration: 200,
      }),
      borderColor: withTiming(enabled ? colors.repeatActive + '30' : colors.borderOverlay, {
        duration: 200,
      }),
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
    <TouchableOpacity onPress={handlePress} style={styles.touchable}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <Ionicons
              name="repeat"
              size={20}
              color={enabled ? colors.repeatActive : colors.interactiveSecondary}
            />
          </Animated.View>

          <ThemedText
            style={[
              styles.label,
              { color: enabled ? colors.repeatActive : colors.interactiveSecondary },
            ]}
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
    elevation: 2,
    minWidth: 100,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM + 2,
    paddingVertical: LAYOUT.SPACING.SMALL + 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  touchable: {
    alignSelf: 'center',
  },
});

export default RepeatButton;
