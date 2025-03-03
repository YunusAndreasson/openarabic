import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCallback, useEffect, memo, useMemo } from 'react';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { Colors } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function ToggleComponent({ value, onValueChange }: ToggleProps) {
  const colors = useColors();
  const isDarkMode = useMemo(
    () => colors.background === Colors.dark.background,
    [colors.background]
  );

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

  // Use Reanimated shared values instead of Animated.Value
  const translateX = useSharedValue(value ? TRAVEL_DISTANCE : 0);
  const toggleScale = useSharedValue(1);

  // Update animation when value changes with improved timing
  useEffect(() => {
    // Use spring for smoother, more natural movement
    translateX.value = withSpring(value ? TRAVEL_DISTANCE : 0, {
      mass: 0.5, // Lower mass for quicker response
      damping: 15, // Slightly higher damping for less bounce
      stiffness: 120, // Increased stiffness for faster animation
      overshootClamping: false,
    });

    // Add subtle scale animation for better feedback
    toggleScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) })
    );
  }, [value, translateX, TRAVEL_DISTANCE, toggleScale]);

  // Handle press with haptic feedback
  const handlePress = useCallback(() => {
    // Add light haptic feedback for better user experience
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  }, [onValueChange, value]);

  // Background color animation
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: value ? colors.tint : isDarkMode ? colors.elevation2 : colors.icon,
      transform: [{ scale: toggleScale.value }],
    };
  }, [value, colors.tint, colors.elevation2, colors.icon, isDarkMode]);

  const handleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

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
      <Animated.View style={[containerStyle, containerAnimatedStyle]}>
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
  shadow: {
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowRadius: 2,
    elevation: 2,
  },
});
