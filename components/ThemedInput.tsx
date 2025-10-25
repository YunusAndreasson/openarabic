import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, Ref } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GestureResponderEvent, TextInputProps } from 'react-native';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { errorFeedback } from '@/utils/haptics';

interface ThemedInputProps extends TextInputProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  error?: string;
  hint?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  onRightIconPress?: (e: GestureResponderEvent) => void;
  style?: TextInputProps['style'];
  ref?: Ref<TextInput>;
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
    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
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
  <TouchableOpacity hitSlop={LAYOUT.HIT_SLOP.MEDIUM} style={styles.rightIcon} onPress={onPress}>
    <Ionicons
      color={error ? colors.tabIconSelected : isFocused ? colors.tint : colors.icon}
      name={name}
      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
    />
  </TouchableOpacity>
);

export function ThemedInput({
  icon,
  rightIcon,
  onRightIconPress,
  style,
  onFocus,
  onBlur,
  error,
  hint,
  ref,
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

  const containerStyles = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: colors.elevation1,
        borderColor: error ? colors.icon : isFocused ? colors.tabIconSelected : colors.tint,
      },
      isFocused && styles.containerFocused,
    ],
    [colors.elevation1, colors.icon, colors.tabIconSelected, colors.tint, error, isFocused],
  );

  const inputStyle = useMemo(
    () => [styles.input, { color: colors.text }, style],
    [colors.text, style],
  );

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

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
          style={inputStyle}
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

ThemedInput.displayName = 'ThemedInput';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
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
