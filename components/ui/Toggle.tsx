import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { getElevation } from '@/constants/elevation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useToggleAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { ToggleProps } from '@/types/ui/form.types';
import { selectionFeedback } from '@/utils/haptics';

const TOUCHABLE_WRAPPER_STYLE = {
  minWidth: MIN_TOUCH_TARGET.LARGE,
  minHeight: MIN_TOUCH_TARGET.LARGE,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

// Static dimensions - computed once at module load
// Modern 2:1 aspect ratio for horizontal pill-shaped toggle (2025+ design trend)
const TOGGLE_HEIGHT = LAYOUT.BUTTON.HEIGHT.SMALL - LAYOUT.SPACING.TINY;
const TOGGLE_PADDING = LAYOUT.SPACING.TINY;
const HANDLE_SIZE = TOGGLE_HEIGHT - TOGGLE_PADDING * 2;
const TOGGLE_WIDTH = TOGGLE_HEIGHT * 2; // 2:1 ratio for modern horizontal look
const TRAVEL_DISTANCE = TOGGLE_WIDTH - HANDLE_SIZE - TOGGLE_PADDING * 2;

export function Toggle({ value, onValueChange, testID, accessibilityLabel }: ToggleProps) {
  const colors = useColors();
  const isMounted = useRef(false);

  const { containerAnimatedStyle, handleAnimatedStyle, forceAnimateToInitialState } =
    useToggleAnimation(value, TRAVEL_DISTANCE);

  // Force initial position on mount only — subsequent changes are animated by useToggleAnimation
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      forceAnimateToInitialState(value);
    }
  }, [value, forceAnimateToInitialState]);

  const handlePress = () => {
    selectionFeedback();
    onValueChange(!value);
  };

  const combinedContainerStyle = [
    containerAnimatedStyle,
    {
      backgroundColor: value ? colors.tint : colors.border,
    },
  ];

  const containerStyle = [
    styles.container,
    {
      width: TOGGLE_WIDTH,
      height: TOGGLE_HEIGHT,
      borderRadius: TOGGLE_HEIGHT / 2,
    },
  ];

  const handleStyle = [
    {
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: value ? colors.elevation3 : colors.elevation2,
    },
    getElevation(colors, 'HAIRLINE'),
  ];

  return (
    <Pressable
      style={TOUCHABLE_WRAPPER_STYLE}
      onPress={handlePress}
      hitSlop={LAYOUT.HIT_SLOP.SMALL}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[containerStyle, combinedContainerStyle]}>
        <View style={styles.toggleTrack}>
          <Animated.View style={[handleStyle, handleAnimatedStyle]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

Toggle.displayName = 'Toggle';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  toggleTrack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
