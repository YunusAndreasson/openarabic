import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { mediumFeedback } from '@/utils/haptics';
import { usePressAnimation } from '@/hooks/animations';

interface DeleteButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onPress, disabled = false }) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: 0.9,
  });

  const handlePress = React.useCallback(() => {
    if (disabled) return;

    mediumFeedback();
    onPress();
  }, [disabled, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.touchable}
      accessibilityRole="button"
      accessibilityLabel="Delete article"
      accessibilityHint="Remove this article from your listening playlist"
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle,
          {
            backgroundColor: colors.error, // Using error color from Colors.ts
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name="trash"
          size={16}
          color={colors.white} // Using white color from Colors.ts
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    ...LAYOUT.SHADOW.SMALL,
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2, // Circular
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
});

export default DeleteButton;
