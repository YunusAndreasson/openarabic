/**
 * Icon: the platform's own symbol for each icon name.
 *
 * jest.setup mocks Icon app-wide (mock-icon-<name>); this suite unmocks it and
 * tests both platform files. The iOS file hands SF Symbols to expo-symbols'
 * native view; the Android file draws the Material Symbols glyph itself in the
 * natively embedded font.
 */

import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';

import { ICON_SYMBOLS, MATERIAL_SYMBOL_FONTS } from '@/constants/icons';

jest.unmock('@/components/ui/Icon');

const { Icon } = jest.requireActual<typeof import('@/components/ui/Icon')>('@/components/ui/Icon');
const { Icon: AndroidIcon } = jest.requireActual<typeof import('@/components/ui/Icon.android')>(
  '@/components/ui/Icon.android',
);

// The Android glyph is hidden from screen readers unless labelled; queries skip
// hidden elements unless asked.
const HIDDEN = { includeHiddenElements: true };

describe('Icon on iOS', () => {
  test('asks expo-symbols for the SF Symbol, at the size and colour given', () => {
    const { getByTestId } = render(<Icon name="trash" size={20} color="#123456" />);
    const symbol = getByTestId('symbol-view');

    expect(symbol.props.symbolName).toBe('trash.fill');
    expect(symbol.props.size).toBe(20);
    expect(symbol.props.tintColor).toBe('#123456');
  });

  test('keeps the Ionicons glyph for a brand logo, which has no SF Symbol', () => {
    const { getByTestId, queryByTestId } = render(<Icon name="logo-google" size={20} />);

    expect(getByTestId('mock-icon-logo-google')).toBeTruthy();
    expect(queryByTestId('symbol-view')).toBeNull();
  });
});

describe('Icon on Android', () => {
  test('draws the Material Symbols glyph in the embedded font, in one pass', () => {
    const { getByText } = render(<AndroidIcon name="trash-outline" size={20} color="#123456" />);
    const glyph = getByText(
      String.fromCharCode(ICON_SYMBOLS['trash-outline'].android.codepoint),
      HIDDEN,
    );
    const style = StyleSheet.flatten(glyph.props.style);

    expect(style?.fontFamily).toBe(MATERIAL_SYMBOL_FONTS.OUTLINED);
    expect(style?.fontSize).toBe(20);
    expect(style?.width).toBe(20);
    expect(style?.color).toBe('#123456');
    // Symbols hold their size at large font scales, as the Ionicons did.
    expect(glyph.props.allowFontScaling).toBe(false);
  });

  test('uses the filled font where iOS uses the .fill symbol', () => {
    const { getByText } = render(<AndroidIcon name="trash" size={20} />);
    const glyph = getByText(String.fromCharCode(ICON_SYMBOLS.trash.android.codepoint), HIDDEN);

    expect(StyleSheet.flatten(glyph.props.style)?.fontFamily).toBe(MATERIAL_SYMBOL_FONTS.FILLED);
  });

  test('keeps a bare glyph away from TalkBack, but not a labelled one', () => {
    const glyphText = String.fromCharCode(ICON_SYMBOLS.search.android.codepoint);
    const { getByText, rerender } = render(<AndroidIcon name="search" size={20} />);
    expect(getByText(glyphText, HIDDEN).props.importantForAccessibility).toBe('no');

    rerender(<AndroidIcon name="search" size={20} accessibilityLabel="Search" />);
    expect(getByText(glyphText, HIDDEN).props.importantForAccessibility).toBeUndefined();
  });

  test('keeps the Ionicons glyph for a brand logo, which has no Material Symbol', () => {
    const { getByTestId } = render(<AndroidIcon name="logo-apple" size={20} />);

    expect(getByTestId('mock-icon-logo-apple')).toBeTruthy();
  });
});
