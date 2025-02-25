import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import * as Haptics from 'expo-haptics';

interface ThemedButtonProps extends TouchableOpacityProps {
  variant?: 'filled' | 'outlined';
  title: string;
  icon?: string;
  loading?: boolean;
  children?: React.ReactNode;
  iconSize?: number;
}

export function ThemedButton({
  variant = 'filled',
  title,
  icon,
  loading,
  style,
  disabled,
  children,
  iconSize = 24, // Increased default icon size
  onPress,
  ...props
}: ThemedButtonProps) {
  const colors = useColors();

  // Handle press with haptic feedback
  const handlePress = (event: GestureResponderEvent) => {
    if (onPress && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress(event);
    }
  };

  // Determine colors based on variant
  const backgroundColor = variant === 'filled' ? colors.tint : 'transparent';
  const textColor = variant === 'filled' ? colors.background : colors.tint;
  const iconColor = variant === 'filled' ? colors.background : colors.tint;
  const borderWidth = variant === 'outlined' ? LAYOUT.BORDER.WIDTH.NORMAL : 0;
  const borderColor = variant === 'outlined' ? colors.tint : colors.cardBorder;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          shadowColor: colors.cardShadow,
        },
        Platform.OS === 'ios' && styles.iosShadow,
        disabled && styles.buttonDisabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
      onPress={handlePress}
      {...props}
    >
      <View style={styles.innerContainer}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={iconSize} color={iconColor} />
          </View>
        )}
        <View style={styles.contentContainer}>
          <ThemedText style={[styles.buttonText, { color: textColor }]} skipDefaultColor>
            {title}
          </ThemedText>
          {children}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.BUTTON.PADDING.VERTICAL.MEDIUM,
    paddingHorizontal: LAYOUT.BUTTON.PADDING.HORIZONTAL.LARGE,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
    minWidth: 160,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
    elevation: 4, // Android elevation
  },
  iosShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  iconContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
