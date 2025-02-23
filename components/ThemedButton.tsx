import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';

interface ThemedButtonProps extends TouchableOpacityProps {
  variant?: 'filled' | 'outlined';
  title: string;
  icon?: string;
  loading?: boolean;
}

export function ThemedButton({
  variant = 'filled',
  title,
  icon,
  loading,
  style,
  disabled,
  ...props
}: ThemedButtonProps) {
  const colors = useColors();

  const buttonStyles = [
    styles.button,
    variant === 'filled'
      ? { backgroundColor: colors.tint }
      : {
          borderColor: colors.tint,
          borderWidth: 1,
          backgroundColor: 'transparent',
        },
    disabled && { opacity: 0.6 },
    style,
  ];

  const textStyles = [
    styles.buttonText,
    {
      color: variant === 'filled' ? colors.background : colors.tint,
    },
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={20}
          color={variant === 'filled' ? colors.background : colors.tint}
          style={styles.icon}
        />
      )}
      <ThemedText style={textStyles} skipDefaultColor>
        {title}
      </ThemedText>
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
    minWidth: 120,
    height: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
});
