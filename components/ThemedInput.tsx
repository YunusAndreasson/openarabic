import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useState, useEffect } from 'react';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ThemedInputProps } from '@/types/ui.types';
import { errorFeedback } from '../utils/haptics';

export function ThemedInput({
  icon,
  rightIcon,
  onRightIconPress,
  style,
  onFocus,
  onBlur,
  error,
  hint,
  ...props
}: ThemedInputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const [prevError, setPrevError] = useState(error);

  useEffect(() => {
    if (error && !prevError) {
      errorFeedback();
    }
    setPrevError(error);
  }, [error, prevError]);

  const containerStyles = [
    styles.container,
    {
      backgroundColor: colors.background,
      borderColor: error ? colors.tabIconSelected : isFocused ? colors.tint : colors.icon,
    },
    isFocused && styles.containerFocused,
  ];

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.wrapper}>
      <View style={containerStyles}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={20}
            color={error ? colors.tabIconSelected : isFocused ? colors.tint : colors.icon}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.icon}
          selectionColor={colors.tint}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={styles.hitSlop}
            style={styles.rightIcon}
          >
            <Ionicons
              name={rightIcon as any}
              size={20}
              color={error ? colors.tabIconSelected : isFocused ? colors.tint : colors.icon}
            />
          </TouchableOpacity>
        )}
      </View>
      {(error || hint) && (
        <ThemedText
          style={[styles.helperText, { color: error ? colors.tabIconSelected : colors.icon }]}
        >
          {error || hint}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: LAYOUT.SPACING.TINY,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: LAYOUT.INPUT.HEIGHT,
    borderRadius: LAYOUT.INPUT.BORDER_RADIUS,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderWidth: LAYOUT.INPUT.BORDER_WIDTH.DEFAULT,
  },
  containerFocused: {
    borderWidth: LAYOUT.INPUT.BORDER_WIDTH.FOCUSED,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
  },
  leftIcon: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  rightIcon: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  hitSlop: {
    top: LAYOUT.SPACING.MEDIUM,
    bottom: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    right: LAYOUT.SPACING.MEDIUM,
  },
  helperText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginTop: LAYOUT.SPACING.TINY,
    marginLeft: LAYOUT.SPACING.TINY,
  },
});
