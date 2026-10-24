/**
 * The shared mocks keep their behaviour inside a test.
 *
 * `resetMocks: true` wipes every jest.fn() implementation before each test, the
 * ones in jest.setup.js and __mocks__/* included, which once left these
 * returning undefined in every test while looking complete. jest.setup.js
 * re-applies the implementations made with `mockStable`; this suite is the
 * check that it still does.
 */

import { describe, expect, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { AppState, Platform, StyleSheet } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';

describe('shared mocks', () => {
  test('react-native answers as it does on iOS', () => {
    expect(Platform.select({ ios: 0, default: 1 })).toBe(0);
    expect(AppState.addEventListener('change', () => {})).toHaveProperty('remove');
  });

  test('StyleSheet.flatten merges nested arrays and drops falsy entries', () => {
    expect(
      StyleSheet.flatten([{ opacity: 1 }, [false, { margin: 2 }], null, { opacity: 0.5 }]),
    ).toEqual({ opacity: 0.5, margin: 2 });
    expect(StyleSheet.flatten(undefined)).toBeUndefined();
  });

  test('async native modules resolve', async () => {
    await expect(AsyncStorage.getItem('key')).resolves.toBeNull();
    await expect(Haptics.selectionAsync()).resolves.toBeUndefined();
  });

  test('scheduleOnRN calls its callback with the arguments', () => {
    const seen: number[] = [];
    scheduleOnRN((value: number) => seen.push(value), 7);
    expect(seen).toEqual([7]);
  });
});
