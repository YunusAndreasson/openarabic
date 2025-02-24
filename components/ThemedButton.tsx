import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';

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
  iconSize = 20,
  ...props
}: ThemedButtonProps) {
  const colors = useColors();

  // Memoize styles to prevent unnecessary rerenders
  const buttonStyles = useMemo(
    () => [
      styles.button,
      variant === 'filled'
        ? { backgroundColor: colors.tint }
        : {
            borderColor: colors.tint,
            borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
            backgroundColor: 'transparent',
          },
      disabled && { opacity: LAYOUT.OPACITY.DISABLED },
      style,
    ],
    [variant, colors.tint, disabled, style]
  );

  const textStyles = useMemo(
    () => [
      styles.buttonText,
      {
        color: variant === 'filled' ? colors.background : colors.tint,
      },
    ],
    [variant, colors.background, colors.tint]
  );

  const iconColor = useMemo(
    () => (variant === 'filled' ? colors.background : colors.tint),
    [variant, colors.background, colors.tint]
  );

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
      {...props}
    >
      <View style={styles.innerContainer}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={iconSize} color={iconColor} />
          </View>
        )}
        <View style={styles.contentContainer}>
          <ThemedText style={textStyles} skipDefaultColor>
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
    paddingVertical: LAYOUT.BUTTON.PADDING.VERTICAL.LARGE,
    paddingHorizontal: LAYOUT.BUTTON.PADDING.HORIZONTAL.LARGE,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
    minWidth: 160,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
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
