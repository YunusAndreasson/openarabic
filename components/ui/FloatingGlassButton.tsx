import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface FloatingActionButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

// Standard FAB dimensions
const FAB_SIZE = 56;
const ICON_SIZE = 24;
// Position just above tab bar
const BOTTOM_OFFSET = 70;

/**
 * Classic floating action button with prominent colored background
 * Works consistently on iOS and Android
 */
export const FloatingGlassButton = memo<FloatingActionButtonProps>(
  ({ iconName, onPress, onLongPress, disabled = false }) => {
    const colors = useColors();

    return (
      <View style={styles.container}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={500}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.tint,
              opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Ionicons name={iconName} size={ICON_SIZE} color={colors.background} />
        </Pressable>
      </View>
    );
  },
);

FloatingGlassButton.displayName = 'FloatingGlassButton';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BOTTOM_OFFSET,
    right: LAYOUT.SPACING.MEDIUM,
    zIndex: 100,
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.ELEVATION.LARGE,
  },
});
