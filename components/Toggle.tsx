import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function ToggleComponent({ value, onValueChange }: ToggleProps) {
  const colors = useColors();

  // Memoize dimensions to prevent recalculation on each render
  const dimensions = useMemo(() => {
    const TOGGLE_HEIGHT = LAYOUT.BUTTON.HEIGHT.SMALL;
    const TOGGLE_PADDING = LAYOUT.SPACING.TINY;
    const HANDLE_SIZE = TOGGLE_HEIGHT - TOGGLE_PADDING * 2;
    const TOGGLE_WIDTH = TOGGLE_HEIGHT * 1.85; // Golden ratio-ish
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

  // Use refs for animated values to prevent recreation on rerenders
  const translateX = useRef(new Animated.Value(value ? TRAVEL_DISTANCE : 0)).current;
  const toggleScale = useRef(new Animated.Value(1)).current;

  // Memoize animation function to prevent recreation on each render
  const animate = useCallback(
    (toValue: number) => {
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        stiffness: 180,
        damping: 15,
        mass: 1,
      }).start();
    },
    [translateX]
  );

  // Memoize press animation function
  const animatePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(toggleScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(toggleScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toggleScale]);

  // Update animation when value changes
  useEffect(() => {
    animate(value ? TRAVEL_DISTANCE : 0);
  }, [value, animate, TRAVEL_DISTANCE]);

  // Memoize press handler to prevent recreation on each render
  const handlePress = useCallback(() => {
    animatePress();
    onValueChange(!value);
  }, [onValueChange, value, animatePress]);

  // Memoize styles to prevent new object creation on each render
  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        width: TOGGLE_WIDTH,
        height: TOGGLE_HEIGHT,
        borderRadius: TOGGLE_HEIGHT / 2,
        backgroundColor: value ? colors.tint : colors.icon,
        transform: [{ scale: toggleScale }],
      },
    ],
    [TOGGLE_HEIGHT, TOGGLE_WIDTH, colors.icon, colors.tint, toggleScale, value]
  );

  const handleStyle = useMemo(
    () => [
      styles.handle,
      {
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        backgroundColor: colors.background,
        transform: [{ translateX }],
        shadowColor: colors.text,
      },
      styles.shadow,
    ],
    [HANDLE_SIZE, colors.background, colors.text, translateX]
  );

  return (
    <TouchableOpacity onPress={handlePress} style={containerStyle} activeOpacity={1}>
      <View style={styles.toggleTrack}>
        <Animated.View style={handleStyle} />
      </View>
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
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
  },
});
