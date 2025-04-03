import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useState, useEffect } from 'react';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ThemedInputProps } from '@/types/ui/form.types';
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
          textAlignVertical="center"
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
        <View style={styles.helperTextContainer}>
          <ThemedText type="caption" variant={error ? 'error' : 'secondary'}>
            {error || hint}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: LAYOUT.INPUT.BORDER_RADIUS,
    borderWidth: LAYOUT.INPUT.BORDER_WIDTH.DEFAULT,
    flexDirection: 'row',
    height: LAYOUT.INPUT.HEIGHT,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  containerFocused: {
    borderWidth: LAYOUT.INPUT.BORDER_WIDTH.FOCUSED,
  },
  helperTextContainer: {
    marginLeft: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.TINY,
  },
  hitSlop: {
    bottom: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    right: LAYOUT.SPACING.MEDIUM,
    top: LAYOUT.SPACING.MEDIUM,
  },
  input: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  leftIcon: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  rightIcon: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  wrapper: {
    marginVertical: LAYOUT.SPACING.TINY,
    width: '100%',
  },
});
