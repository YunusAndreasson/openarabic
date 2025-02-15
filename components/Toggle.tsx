import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import { useColors } from '@/hooks/useColors';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(value ? 28 : 0)).current;

  const animate = useCallback(
    (toValue: number) => {
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    },
    [translateX]
  );

  useEffect(() => {
    animate(value ? 28 : 0);
  }, [value, animate]);

  const handlePress = useCallback(() => {
    onValueChange(!value);
  }, [onValueChange, value]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: value ? colors.tint : colors.icon,
        },
      ]}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.handle,
          {
            backgroundColor: colors.background,
            transform: [{ translateX }],
            shadowColor: colors.text,
            shadowOffset: styles.shadow.shadowOffset,
          },
          styles.shadow,
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  handle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  shadow: {
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
});
