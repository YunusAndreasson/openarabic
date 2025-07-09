import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function DictionaryButton(): JSX.Element {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = useCallback(() => {
    router.push('/(tabs)/practice/dictionary');
  }, []);

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
        animatedStyle as ViewStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
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
        numberOfLines={1}
      >
        Dictionary
      </ThemedText>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: 70,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
  },
});
