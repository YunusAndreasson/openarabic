import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useCallback, memo, useMemo } from 'react';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import Animated from 'react-native-reanimated';
import { lightFeedback } from '../utils/haptics';
import { useToggleAnimation } from '@/hooks/animations';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { ToggleProps } from '@/types/ui.types';

function ToggleComponent({ value, onValueChange }: ToggleProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

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
  const { containerAnimatedStyle, handleAnimatedStyle } = useToggleAnimation(
    value,
    TRAVEL_DISTANCE
  );

  // Handle press with haptic feedback
  const handlePress = useCallback(() => {
    // Add light haptic feedback for better user experience
    lightFeedback();
    onValueChange(!value);
  }, [onValueChange, value]);

  // Background color animation - combine with containerAnimatedStyle
  const combinedContainerStyle = useMemo(() => {
    return [
      containerAnimatedStyle,
      {
        backgroundColor: value ? colors.tint : isDarkMode ? colors.elevation2 : colors.icon,
      },
    ];
  }, [containerAnimatedStyle, value, colors.tint, colors.elevation2, colors.icon, isDarkMode]);

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
      shadowOpacity: isDarkMode ? 0 : LAYOUT.OPACITY.OVERLAY,
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
        backgroundColor: colors.background,
        ...shadowStyle,
      },
      styles.shadow,
    ],
    [HANDLE_SIZE, colors.background, shadowStyle]
  );

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
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
  toggleTrack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  handle: {
    position: 'relative',
  },
  shadow:
    Platform.OS === 'ios'
      ? {
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          shadowOpacity: 0.1,
        }
      : {
          elevation: 2,
        },
});
