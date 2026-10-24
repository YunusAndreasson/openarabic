import { GlyphButton } from '@/components/ui/GlyphButton';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { Ref } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { TextInputInstance, TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

/**
 * A focused field's ring, drawn as an outline outside the 1pt border. Together
 * they make the FOCUSED weight. It used to be the border itself growing from 1
 * to 2pt, which moved the text, the icons and the placeholder 1pt inwards
 * every time the field gained or lost focus; an outline takes no layout.
 */
const FOCUS_RING_WIDTH = LAYOUT.INPUT.BORDER_WIDTH.FOCUSED - LAYOUT.INPUT.BORDER_WIDTH.DEFAULT;

interface ThemedInputBaseProps extends TextInputProps {
  icon?: IconName;
  error?: string;
  hint?: string;
  onRightIconPress?: () => void;
  style?: TextInputProps['style'];
  ref?: Ref<TextInputInstance>;
}

/** A right icon is a button with no text, so it comes with what it does. */
type ThemedInputProps = ThemedInputBaseProps &
  (
    | { rightIcon?: undefined; rightIconAccessibilityLabel?: undefined }
    | {
        rightIcon: IconName;
        /** What the right icon does, for screen readers — it has no text to fall back on. */
        rightIconAccessibilityLabel: string;
      }
  );

const InputIcon = ({
  name,
  isFocused,
  error,
  colors,
}: {
  name: IconName;
  isFocused: boolean;
  error?: string;
  colors: ReturnType<typeof useColors>;
}) => (
  <Icon
    color={error ? colors.error : isFocused ? colors.tint : colors.icon}
    name={name}
    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
    style={styles.leftIcon}
  />
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
  multiline = false,
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
  const containerStyles = useMemo(() => {
    const ringColor = error ? colors.error : isFocused ? colors.tint : colors.border;
    return [
      styles.container,
      multiline && styles.containerMultiline,
      { backgroundColor: colors.elevation1, borderColor: ringColor },
      isFocused && { outlineColor: ringColor, outlineWidth: FOCUS_RING_WIDTH },
    ];
  }, [colors.border, colors.elevation1, colors.error, colors.tint, error, isFocused, multiline]);

  const inputStyle = useMemo(
    () => [styles.input, multiline && styles.inputMultiline, { color: colors.text }, style],
    [colors.text, multiline, style],
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
        {/* The defaults suit the single-line fields this mostly draws — an email,
            a password, a confirmation word. A multiline field is prose, so it
            gets the platform's sentence-case and autocorrect back. */}
        <TextInput
          ref={ref}
          autoCapitalize={multiline ? 'sentences' : 'none'}
          autoCorrect={multiline}
          multiline={multiline}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.tint}
          style={inputStyle}
          textAlignVertical={multiline ? 'top' : 'center'}
          onBlur={handleBlur}
          onFocus={handleFocus}
          {...props}
        />
        {rightIcon ? (
          <GlyphButton
            accessibilityLabel={rightIconAccessibilityLabel}
            color={error ? colors.error : isFocused ? colors.tint : colors.icon}
            icon={rightIcon}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            style={styles.rightIcon}
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
  // A text area: it opens at MULTILINE_MIN_HEIGHT, grows with its text to
  // MULTILINE_HEIGHT, then scrolls inside itself.
  containerMultiline: {
    alignItems: 'stretch',
    height: 'auto',
    minHeight: LAYOUT.INPUT.MULTILINE_MIN_HEIGHT,
    maxHeight: LAYOUT.INPUT.MULTILINE_HEIGHT,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  helperTextContainer: {
    marginLeft: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.TINY,
  },
  input: {
    flex: 1,
    // A TextInput inherits no family, so without this the one place the
    // learner writes was set in SF Pro / Roboto beside Inter everywhere else.
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  inputMultiline: {
    height: 'auto',
    textAlignVertical: 'top',
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
