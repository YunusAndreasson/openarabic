import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
  ViewStyle,
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
  iconComponent?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
  iconSize?: number;
  contentContainerStyle?: ViewStyle;
  innerContainerStyle?: ViewStyle;
}

export function ThemedButton({
  variant = 'filled',
  title,
  icon,
  iconComponent,
  loading,
  style,
  disabled,
  children,
  iconSize = 24,
  onPress,
  contentContainerStyle,
  innerContainerStyle,
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
  const isFilled = variant === 'filled';
  const backgroundColor = isFilled ? colors.tint : 'transparent';
  const textColor = isFilled ? colors.background : colors.tint;
  const iconColor = isFilled ? colors.background : colors.tint;

  // Only apply border for filled variant on Android
  // iOS uses shadows instead
  const borderWidth = Platform.OS === 'android' ? (isFilled ? 0 : 1) : 0;

  // Apply styles in correct order to allow overrides
  const buttonStyles = [
    styles.button,
    {
      backgroundColor,
      borderWidth,
      borderColor: colors.tint,
      shadowColor: colors.cardShadow,
    },
    isFilled && Platform.OS === 'ios' && styles.iosShadow,
    disabled && styles.buttonDisabled,
    // Platform specific elevation
    Platform.OS === 'android' && isFilled && { elevation: 4 },
    style, // User style comes last to override default styles
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
      onPress={handlePress}
      {...props}
    >
      <View style={[styles.innerContainer, innerContainerStyle]}>
        {iconComponent ? (
          <View style={styles.iconContainer}>{iconComponent}</View>
        ) : icon ? (
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={iconSize} color={iconColor} />
          </View>
        ) : null}

        <View style={[styles.contentContainer, contentContainerStyle]}>
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
