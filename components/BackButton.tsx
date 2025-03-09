import React, { useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import * as Haptics from 'expo-haptics';

interface BackButtonProps {
  /**
   * Callback when the back button is pressed
   */
  onPress: () => void;

  /**
   * Optional button text, defaults to "Back to home"
   */
  text?: string;
}

/**
 * A stylized back button component with haptic feedback
 */
const BackButton = React.memo(({ onPress, text = 'Back to home' }: BackButtonProps) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Memoize styles that use colors to prevent new object creation on each render
  const tintTextStyle = useMemo(() => ({ color: colors.tint }), [colors.tint]);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.textOverlay,
            opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1,
          },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={text}
      >
        <ThemedText style={[styles.arrow, tintTextStyle]} skipDefaultColor>
          ←
        </ThemedText>
        <ThemedText style={[styles.text, tintTextStyle]} skipDefaultColor>
          {text}
        </ThemedText>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    minHeight: 44,
  },
  arrow: {
    fontSize: 16,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginLeft: LAYOUT.SPACING.TINY,
    fontWeight: '500',
  },
});

BackButton.displayName = 'BackButton';

export default BackButton;
