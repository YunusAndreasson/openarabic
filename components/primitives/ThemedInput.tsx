import { Ionicons } from '@/components/ui/Icon';
import type { ComponentProps, Ref } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { GestureResponderEvent, TextInputProps } from 'react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ThemedInputProps extends TextInputProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  /** What the right icon does, for screen readers — it has no text to fall back on. */
  rightIconAccessibilityLabel?: string;
  error?: string;
  hint?: string;
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
    color={error ? colors.error : isFocused ? colors.tint : colors.icon}
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
  accessibilityLabel,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  isFocused: boolean;
  error?: string;
  colors: ReturnType<typeof useColors>;
  onPress?: (e: GestureResponderEvent) => void;
  accessibilityLabel?: string;
}) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
    onPress={onPress}
    style={({ pressed }) => [styles.rightIcon, pressed && styles.rightIconPressed]}
  >
    <Ionicons
      color={error ? colors.error : isFocused ? colors.tint : colors.icon}
      name={name}
      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
    />
  </Pressable>
);

export function ThemedInput({
  icon,
  rightIcon,
  rightIconAccessibilityLabel,
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

  // At rest the border is neutral; focus is what brings in the tint. It used to
  // read `isFocused ? colors.tabIconSelected : colors.tint` — but every theme
  // defines `tabIconSelected` as `tint`, so both branches painted the same brand
  // green and focusing an input changed nothing. Worse, a resting field was
  // already outlined in the accent colour, so nothing on the form could look
  // more active than the fields around it.
  const containerStyles = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: colors.elevation1,
        borderColor: error ? colors.error : isFocused ? colors.tint : colors.border,
      },
      isFocused && styles.containerFocused,
    ],
    [colors.border, colors.elevation1, colors.error, colors.tint, error, isFocused],
  );

  const inputStyle = useMemo(
    () => [styles.input, { color: colors.text }, style],
    [colors.text, style],
  );

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
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
            accessibilityLabel={rightIconAccessibilityLabel}
            colors={colors}
            error={error}
            isFocused={isFocused}
            name={rightIcon}
            onPress={onRightIconPress}
          />
        ) : null}
      </View>
      {error || hint ? (
        // Announced on change so a screen reader reports a validation failure
        // instead of leaving the field silently rejected.
        <View
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={styles.helperTextContainer}
        >
          <ThemedText colorName={error ? 'error' : 'secondaryText'} type="caption">
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
  rightIconPressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  wrapper: {
    marginVertical: LAYOUT.SPACING.TINY,
    width: '100%',
  },
});
