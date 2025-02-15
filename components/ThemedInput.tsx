import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useState } from 'react';
import { ThemedText } from './ThemedText';

interface ThemedInputProps extends TextInputProps {
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  error?: string;
  hint?: string;
}

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
    marginVertical: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  containerFocused: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 8,
  },
  hitSlop: {
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
