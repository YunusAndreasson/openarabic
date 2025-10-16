import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useToggleAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ToggleProps } from '@/types/ui/form.types';
import { selectionFeedback } from '@/utils/haptics';

const TOUCHABLE_WRAPPER_STYLE = {
  minWidth: MIN_TOUCH_TARGET.LARGE,
  minHeight: MIN_TOUCH_TARGET.LARGE,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

function getToggleDimensions() {
  const TOGGLE_HEIGHT = LAYOUT.BUTTON.HEIGHT.SMALL - LAYOUT.SPACING.TINY;
  const TOGGLE_PADDING = LAYOUT.SPACING.TINY;
  const HANDLE_SIZE = TOGGLE_HEIGHT - TOGGLE_PADDING * 2;
  const TOGGLE_WIDTH = TOGGLE_HEIGHT * 1.75;
  const TRAVEL_DISTANCE = TOGGLE_WIDTH - HANDLE_SIZE - TOGGLE_PADDING * 2;
  return {
    TOGGLE_HEIGHT,
    TOGGLE_PADDING,
    HANDLE_SIZE,
    TOGGLE_WIDTH,
    TRAVEL_DISTANCE,
  };
}

function ToggleComponent({ value, onValueChange }: ToggleProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isMounted = useRef(false);

  const { TOGGLE_HEIGHT, HANDLE_SIZE, TOGGLE_WIDTH, TRAVEL_DISTANCE } = getToggleDimensions();

  const { containerAnimatedStyle, handleAnimatedStyle, forceAnimateToInitialState } =
    useToggleAnimation(value, TRAVEL_DISTANCE);

  useEffect(() => {
    isMounted.current = true;

    if (forceAnimateToInitialState) {
      forceAnimateToInitialState(value);
    }
  }, [value, forceAnimateToInitialState]);

  const handlePress = useCallback(() => {
    selectionFeedback();
    onValueChange(!value);
  }, [onValueChange, value]);

  const combinedContainerStyle = useMemo(() => {
    return [
      containerAnimatedStyle,
      {
        backgroundColor: value ? colors.tint : colors.border,
      },
    ];
  }, [containerAnimatedStyle, value, colors.tint, colors.border]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        width: TOGGLE_WIDTH,
        height: TOGGLE_HEIGHT,
        borderRadius: TOGGLE_HEIGHT / 2,
      },
    ],
    [TOGGLE_HEIGHT, TOGGLE_WIDTH]
  );

  const shadowStyle = useMemo(
    () => ({
      shadowColor: colors.shadow,
      shadowOpacity: LAYOUT.OPACITY.SUBTLE,
    }),
    [colors.shadow, isDarkMode]
  );

  const handleStyle = useMemo(
    () => [
      styles.handle,
      {
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        backgroundColor: value
          ? colors.elevation3 // Floating elevated surface when active
          : colors.elevation2, // Raised surface when inactive
        ...shadowStyle,
      },
      styles.shadow,
    ],
    [HANDLE_SIZE, value, colors.elevation2, colors.elevation3, shadowStyle]
  );

  return (
    <Pressable style={TOUCHABLE_WRAPPER_STYLE} onPress={handlePress}>
      <Animated.View style={[containerStyle, combinedContainerStyle]}>
        <View style={styles.toggleTrack}>
          <Animated.View style={[handleStyle, handleAnimatedStyle]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const Toggle = memo(ToggleComponent);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  handle: {
    position: 'relative',
  },
  shadow: {
    // Extract only shadow properties, excluding 'level' which is not valid for ViewStyle
    ...(function () {
      const { level, ...shadowProps } = LAYOUT.ELEVATION.SUBTLE;
      return shadowProps;
    })(),
  },
  toggleTrack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
