import Ionicons from '@react-native-vector-icons/ionicons';
import { StyleSheet, Text } from 'react-native';

import { ICON_SYMBOLS, MATERIAL_SYMBOL_FONTS } from '@/constants/icons';

import { DEFAULT_ICON_SIZE, type IconProps } from './iconProps';

export type { IconName } from '@/constants/icons';
export type { IconProps } from './iconProps';

/**
 * Material Symbols, drawn as one glyph of the Material Symbols font that
 * expo-font embeds natively (app.json), so it is registered before JS runs.
 *
 * Not expo-symbols' `SymbolView`: on Android that view loads the font in a
 * mount effect and draws an empty box until it resolves — every icon in a
 * recycled list row would blink. With the font already native, the glyph draws
 * in the same frame as its row.
 *
 * The glyph is a private-use character, so it is kept away from TalkBack unless
 * the caller labels it; the control around an icon carries the label.
 */
export function Icon({ name, size = DEFAULT_ICON_SIZE, color, style, ...viewProps }: IconProps) {
  const glyph = ICON_SYMBOLS[name].android;

  if (!glyph) {
    return <Ionicons name={name} size={size} color={color} style={style} {...viewProps} />;
  }

  return (
    <Text
      importantForAccessibility={viewProps.accessibilityLabel ? undefined : 'no'}
      {...viewProps}
      // Symbols keep their size with the system font scale, like Ionicons did;
      // the text beside them is what scales.
      allowFontScaling={false}
      style={[
        styles.glyph,
        {
          fontFamily: glyph.filled ? MATERIAL_SYMBOL_FONTS.FILLED : MATERIAL_SYMBOL_FONTS.OUTLINED,
          fontSize: size,
          lineHeight: size,
          width: size,
          height: size,
          color,
        },
        style,
      ]}
    >
      {String.fromCharCode(glyph.codepoint)}
    </Text>
  );
}

const styles = StyleSheet.create({
  glyph: {
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
