/**
 * The registry's job is to be the single place a persisted key is written. These
 * guard the two ways that can silently break: two keys resolving to the same
 * string (one feature quietly reading another's data), and a per-user key that
 * forgets to include the user (every account sharing one value).
 */
import { describe, expect, test } from '@jest/globals';

import {
  accountOwnedStorageKeys,
  REDUX_PERSIST_KEY,
  STORAGE_KEYS,
  USER_STORAGE_KEYS,
  scopedKey,
} from '@/constants/storageKeys';

describe('storageKeys', () => {
  test('no two keys share a value', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  test('every key is a non-empty string', () => {
    const empty = Object.entries(STORAGE_KEYS).filter(([, value]) => !value);
    expect(empty).toEqual([]);
  });

  describe('scopedKey', () => {
    test('appends the user id', () => {
      expect(scopedKey(STORAGE_KEYS.ONBOARDING_PROGRESS, 'user-1')).toBe(
        `${STORAGE_KEYS.ONBOARDING_PROGRESS}:user-1`,
      );
    });

    test('falls back to the bare key when signed out', () => {
      expect(scopedKey(STORAGE_KEYS.ONBOARDING_PROGRESS, null)).toBe(
        STORAGE_KEYS.ONBOARDING_PROGRESS,
      );
      expect(scopedKey(STORAGE_KEYS.ONBOARDING_PROGRESS)).toBe(STORAGE_KEYS.ONBOARDING_PROGRESS);
    });

    test('two users never share a scoped key', () => {
      expect(scopedKey(STORAGE_KEYS.TUTORIAL_WORD_TAP, 'a')).not.toBe(
        scopedKey(STORAGE_KEYS.TUTORIAL_WORD_TAP, 'b'),
      );
    });
  });

  describe('USER_STORAGE_KEYS', () => {
    test('every builder includes the user id', () => {
      const missing = Object.entries(USER_STORAGE_KEYS)
        .filter(([, build]) => !build('user-42').includes('user-42'))
        .map(([name]) => name);
      expect(missing).toEqual([]);
    });

    test('the screenshot key stays distinct when signed out', () => {
      expect(USER_STORAGE_KEYS.screenshotPermissionDenied(null)).toContain('anonymous');
    });
  });

  describe('accountOwnedStorageKeys', () => {
    test('sweeps the data that would otherwise follow the device to the next account', () => {
      const keys = accountOwnedStorageKeys('user-7');

      // The point of the scope table: these carry no user id in the key, so
      // before it existed they survived a sign-out and were read as the next
      // account's streak, pacing history and daily cap.
      expect(keys).toContain(STORAGE_KEYS.STUDY_DAYS);
      expect(keys).toContain(STORAGE_KEYS.RECENT_RECALL_SESSIONS);
      expect(keys).toContain(STORAGE_KEYS.DAILY_WORD_COUNT);
      expect(keys).toContain(STORAGE_KEYS.DAILY_WORD_RESET_DATE);
      expect(keys).toContain(STORAGE_KEYS.NOTIFICATION_PROMPT_STATE);
      expect(keys).toContain(STORAGE_KEYS.SMART_REMINDER_PREFS);
      expect(keys).toContain(STORAGE_KEYS.QUERY_CACHE);
    });

    test('rebuilds the user-scoped keys for the departing account', () => {
      const keys = accountOwnedStorageKeys('user-7');

      expect(keys).toContain(`${STORAGE_KEYS.ONBOARDING_PROGRESS}:user-7`);
      expect(keys).toContain(`${STORAGE_KEYS.TUTORIAL_WELCOME_INTRO}:user-7`);
      expect(keys).toContain(USER_STORAGE_KEYS.profilePhoto('user-7'));
      // Never the bare key — that would clear whatever a scoped read never sees.
      expect(keys).not.toContain(STORAGE_KEYS.ONBOARDING_PROGRESS);
    });

    test('leaves device-level keys alone', () => {
      const keys = accountOwnedStorageKeys('user-7');

      expect(keys).not.toContain(STORAGE_KEYS.AUDIO_CACHE_LEGACY_SWEEP);
      expect(keys).not.toContain(STORAGE_KEYS.REDUX_PERSIST_ROOT);
    });

    test('returns no duplicates', () => {
      const keys = accountOwnedStorageKeys('user-7');
      expect(new Set(keys).size).toBe(keys.length);
    });

    test('covers every non-device key in the registry', () => {
      // Guards the derivation itself: if `accountOwnedStorageKeys` stopped
      // walking the scope table and went back to a hand-written list, a key
      // added to STORAGE_KEYS would fall out of this count.
      const deviceKeys = [STORAGE_KEYS.AUDIO_CACHE_LEGACY_SWEEP, STORAGE_KEYS.REDUX_PERSIST_ROOT];
      const expectedStatic = Object.values(STORAGE_KEYS).length - deviceKeys.length;
      const expectedBuilders = Object.keys(USER_STORAGE_KEYS).length;

      expect(accountOwnedStorageKeys('user-7')).toHaveLength(expectedStatic + expectedBuilders);
    });
  });

  test('the redux-persist key matches the value the library actually writes', () => {
    expect(STORAGE_KEYS.REDUX_PERSIST_ROOT).toBe(`persist:${REDUX_PERSIST_KEY}`);
  });
});
