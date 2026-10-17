/**
 * ICON_SYMBOLS stores each Android glyph's codepoint so Icon can draw it in one
 * pass. This pins every codepoint to expo-symbols' own name table, so a
 * mistyped codepoint or a renamed symbol fails here instead of drawing the
 * wrong glyph (or a tofu box) on Android.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from '@jest/globals';

import { ICON_SYMBOLS } from '@/constants/icons';

const androidSymbols = JSON.parse(
  readFileSync(
    path.join(__dirname, '../../node_modules/expo-symbols/build/android/symbols.json'),
    'utf8',
  ),
) as Record<string, number>;

const entries = Object.entries(ICON_SYMBOLS);

describe('ICON_SYMBOLS', () => {
  test.each(entries.filter(([, symbol]) => symbol.android !== null))(
    '%s draws the codepoint expo-symbols gives its Material Symbol',
    (_name, symbol) => {
      expect(symbol.android).not.toBeNull();
      if (!symbol.android) return;
      expect(androidSymbols[symbol.android.name]).toBe(symbol.android.codepoint);
    },
  );

  test.each(entries.filter(([, symbol]) => symbol.android !== null && symbol.ios !== null))(
    '%s is filled on Android exactly when iOS uses the .fill symbol',
    (_name, symbol) => {
      expect(symbol.android?.filled).toBe(symbol.ios?.endsWith('.fill'));
    },
  );

  test('only the brand logos lack a system symbol', () => {
    const missing = entries
      .filter(([, symbol]) => symbol.ios === null || symbol.android === null)
      .map(([name]) => name);

    expect(missing.every(name => name.startsWith('logo-'))).toBe(true);
  });
});
