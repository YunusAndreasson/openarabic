import { router } from 'expo-router';
import type { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { UiAction } from '@/types/enums';
import { HEADER_BUTTON_STYLE, HEADER_BUTTON_TEXT_STYLE } from '@/utils/buttonStyleUtils';
import { createAndroidRipple } from '@/utils/layoutUtils';

interface DoneButtonProps {
  /**
   * Optional callback when done is pressed (defaults to router.back())
   */
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Small delay to let press animation complete before navigation
const NAVIGATION_DELAY = TIMING_CONFIG.FAST.duration / 2; // 60ms

export const DoneButton: FC<DoneButtonProps> = ({ onPress }) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default behavior: navigate back with slight delay for better UX
      setTimeout(() => {
        router.back();
      }, NAVIGATION_DELAY);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[
          styles.button,
          {
            backgroundColor: colors.transparent,
          },
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={createAndroidRipple(colors)}
      >
        <ThemedText
          type="body"
          weight="semibold"
          style={[
            styles.buttonText,
            {
              color: colors.tint,
            },
          ]}
        >
          {UiAction.CLOSE}
        </ThemedText>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: HEADER_BUTTON_STYLE,
  buttonText: HEADER_BUTTON_TEXT_STYLE,
});
