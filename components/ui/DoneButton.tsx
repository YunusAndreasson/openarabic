import { router } from 'expo-router';
import { memo, useCallback, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { UiAction } from '@/types/enums';

interface DoneButtonProps {
  /**
   * Optional callback when done is pressed (defaults to router.back())
   */
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DoneButton: FC<DoneButtonProps> = ({ onPress }) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      // Default behavior: navigate back with slight delay for better UX
      setTimeout(() => {
        router.back();
      }, 50); // Small delay to let the press animation complete
    }
  }, [onPress]);

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
        android_ripple={{
          color: colors.navigationRipple,
          radius: MIN_TOUCH_TARGET.MEDIUM / 2,
        }}
        accessibilityRole="button"
        accessibilityLabel={UiAction.DONE}
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
          {UiAction.DONE}
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

export default memo(DoneButton);
