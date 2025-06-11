import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, forwardRef } from 'react';
import type { ComponentProps } from 'react';
import type {
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  GestureResponderEvent,
} from 'react-native';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { errorFeedback } from '@/utils/haptics';

import { ThemedText } from './ThemedText';

interface ThemedInputProps extends TextInputProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  error?: string;
  hint?: string;
  onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onRightIconPress?: (e: GestureResponderEvent) => void;
  style?: TextInputProps['style'];
}

const InputIcon = ({
  name,
  isFocused,
  error,
  colors,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  isFocused: boolean;
  error?: string;
  colors: ReturnType<typeof useColors>;
}) => (
  <Ionicons
    color={error ? colors.tabIconSelected : isFocused ? colors.tint : colors.icon}
    name={name}
    size={20}
    style={styles.leftIcon}
  />
);

const RightInputIcon = ({
  name,
  isFocused,
  error,
  colors,
  onPress,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  isFocused: boolean;
  error?: string;
  colors: ReturnType<typeof useColors>;
  onPress?: (e: GestureResponderEvent) => void;
}) => (
  <TouchableOpacity
    hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
    style={styles.rightIcon}
    onPress={onPress}
  >
    <Ionicons
      color={error ? colors.tabIconSelected : isFocused ? colors.tint : colors.icon}
      name={name}
      size={20}
    />
  </TouchableOpacity>
);

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(
  ({ icon, rightIcon, onRightIconPress, style, onFocus, onBlur, error, hint, ...props }, ref) => {
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

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View style={styles.wrapper}>
        <View style={containerStyles}>
          {icon ? (
            <InputIcon colors={colors} error={error} isFocused={isFocused} name={icon} />
          ) : null}
          <TextInput
            ref={ref}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.tint}
            style={[styles.input, { color: colors.text }, style]}
            textAlignVertical="center"
            onBlur={handleBlur}
            onFocus={handleFocus}
            {...props}
          />
          {rightIcon ? (
            <RightInputIcon
              colors={colors}
              error={error}
              isFocused={isFocused}
              name={rightIcon}
              onPress={onRightIconPress}
            />
          ) : null}
        </View>
        {error || hint ? (
          <View style={styles.helperTextContainer}>
            <ThemedText type="caption" variant={error ? 'error' : 'secondary'}>
              {error || hint}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }
);

ThemedInput.displayName = 'ThemedInput';

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
