import { useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useToggleAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ToggleProps } from '@/types/ui/form.types';
import { selectionFeedback } from '@/utils/haptics';

function ToggleComponent({ value, onValueChange }: ToggleProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isMounted = useRef(false);

  const dimensions = useMemo(() => {
    const TOGGLE_HEIGHT = LAYOUT.BUTTON.HEIGHT.SMALL - 4;
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
  }, []);

  const { TOGGLE_HEIGHT, HANDLE_SIZE, TOGGLE_WIDTH, TRAVEL_DISTANCE } = dimensions;

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
        backgroundColor: value ? colors.tint : isDarkMode ? colors.border : colors.border,
      },
    ];
  }, [containerAnimatedStyle, value, colors.tint, colors.border, isDarkMode]);

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
          ? colors.background
          : isDarkMode
            ? colors.textTertiary
            : colors.white,
        ...shadowStyle,
      },
      styles.shadow,
    ],
    [
      HANDLE_SIZE,
      value,
      colors.background,
      colors.white,
      colors.textTertiary,
      isDarkMode,
      shadowStyle,
    ]
  );

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={{
        minWidth: MIN_TOUCH_TARGET.SIZE,
        minHeight: MIN_TOUCH_TARGET.SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={handlePress}
    >
      <Animated.View style={[containerStyle, combinedContainerStyle]}>
        <View style={styles.toggleTrack}>
          <Animated.View style={[handleStyle, handleAnimatedStyle]} />
        </View>
      </Animated.View>
    </TouchableOpacity>
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
  shadow: LAYOUT.SHADOW.SUBTLE,
  toggleTrack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
