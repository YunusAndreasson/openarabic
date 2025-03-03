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
} from 'react-native-reanimated';

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

  // Update animation when value changes
  useEffect(() => {
    translateX.value = withSpring(value ? TRAVEL_DISTANCE : 0, {
      stiffness: 180,
      damping: 15,
      mass: 1,
    });
  }, [value, TRAVEL_DISTANCE, translateX]);

  // Memoize press handler to prevent recreation on each render
  const handlePress = useCallback(() => {
    // Animate press effect
    toggleScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 150 })
    );

    onValueChange(!value);
  }, [onValueChange, value, toggleScale]);

  // Use Reanimated's useAnimatedStyle for better performance
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: toggleScale.value }],
      backgroundColor: value ? colors.tint : colors.icon,
    };
  }, [value, colors.tint, colors.icon]);

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

// Memoize the component to prevent unnecessary rerenders
export const Toggle = memo(ToggleComponent);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  toggleTrack: {
    position: 'absolute',
    left: LAYOUT.SPACING.TINY,
    right: LAYOUT.SPACING.TINY,
    top: LAYOUT.SPACING.TINY,
    bottom: LAYOUT.SPACING.TINY,
  },
  handle: {
    position: 'absolute',
  },
  shadow: {
    shadowRadius: LAYOUT.SPACING.TINY / 2,
    elevation: LAYOUT.Z_INDEX.CARD,
    shadowOffset: {
      width: 0,
      height: 1,
    },
  },
});
