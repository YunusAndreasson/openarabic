import { useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useToggleAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ToggleProps } from '@/types/ui/form.types';

import { selectionFeedback } from '../utils/haptics';

function ToggleComponent({ value, onValueChange }: ToggleProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isMounted = useRef(false);

  // Memoize dimensions to prevent recalculation on each render
  const dimensions = useMemo(() => {
    const TOGGLE_HEIGHT = LAYOUT.BUTTON.HEIGHT.SMALL - 4; // Make it slightly smaller
    const TOGGLE_PADDING = LAYOUT.SPACING.TINY;
    const HANDLE_SIZE = TOGGLE_HEIGHT - TOGGLE_PADDING * 2;
    const TOGGLE_WIDTH = TOGGLE_HEIGHT * 1.75; // Slightly smaller ratio
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

  // Use the standardized toggle animation hook
  const { containerAnimatedStyle, handleAnimatedStyle, forceAnimateToInitialState } =
    useToggleAnimation(value, TRAVEL_DISTANCE);

  // Set mounted flag after initial render
  useEffect(() => {
    isMounted.current = true;
    // Force immediate animation to initial state to avoid glitching
    if (forceAnimateToInitialState) {
      forceAnimateToInitialState(value);
    }
  }, [value, forceAnimateToInitialState]);

  // Handle press with haptic feedback
  const handlePress = useCallback(() => {
    // Add selection haptic feedback for toggle state changes
    selectionFeedback();
    onValueChange(!value);
  }, [onValueChange, value]);

  // Background color animation - combine with containerAnimatedStyle
  const combinedContainerStyle = useMemo(() => {
    return [
      containerAnimatedStyle,
      {
        backgroundColor: value ? colors.tint : isDarkMode ? colors.border : colors.border,
      },
    ];
  }, [containerAnimatedStyle, value, colors.tint, colors.border, isDarkMode]);

  // Memoize static styles to prevent new object creation on each render
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
      accessibilityHint="Double tap to toggle"
      accessibilityLabel={value ? 'Toggle is on' : 'Toggle is off'}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
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

// Use memo to prevent unnecessary re-renders
export const Toggle = memo(ToggleComponent);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  handle: {
    position: 'relative',
  },
  shadow:
    Platform.OS === 'ios'
      ? {
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          shadowOpacity: LAYOUT.OPACITY.SUBTLE,
        }
      : {
          elevation: LAYOUT.ELEVATION.SUBTLE,
        },
  toggleTrack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
