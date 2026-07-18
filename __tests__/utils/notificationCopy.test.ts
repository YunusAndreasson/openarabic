/**
 * notificationCopy — deterministic rotation over the smart-reminder pools
 */

import { describe, expect, test } from '@jest/globals';

import { STRINGS } from '../../constants/strings';
import {
  buildReminderContent,
  dayOfYearSeed,
  isolateRtl,
  reminderKindForPlan,
} from '../../utils/notificationCopy';

const MAX_TITLE_LENGTH = 40;
const MAX_BODY_LENGTH = 130;

describe('isolateRtl', () => {
  test('wraps the word in FSI…PDI isolates', () => {
    expect(isolateRtl('كِتاب')).toBe('⁦كِتاب⁩');
  });
});

describe('reminderKindForPlan', () => {
  test('small slipping batch with a word → personalized', () => {
    expect(reminderKindForPlan('srs-slipping', 2, true)).toBe('word');
  });

  test('large slipping batch → count copy even with a word', () => {
    expect(reminderKindForPlan('srs-slipping', 8, true)).toBe('slipping');
  });

  test('slipping without a word → count copy', () => {
    expect(reminderKindForPlan('srs-slipping', 1, false)).toBe('slipping');
  });

  test('due buckets split at five', () => {
    expect(reminderKindForPlan('srs-due', 5, false)).toBe('due-few');
    expect(reminderKindForPlan('srs-due', 6, false)).toBe('due-many');
  });
});

describe('buildReminderContent', () => {
  test('rotation is deterministic and consecutive seeds never repeat text', () => {
    const first = buildReminderContent('due-few', { count: 3 }, 10);
    const again = buildReminderContent('due-few', { count: 3 }, 10);
    const next = buildReminderContent('due-few', { count: 3 }, 11);

    expect(again).toEqual(first);
    expect(next.title).not.toBe(first.title);
    expect(next.body).not.toBe(first.body);
  });

  test('count is interpolated into due copy', () => {
    for (let seed = 0; seed < 8; seed++) {
      const { body } = buildReminderContent('due-many', { count: 12 }, seed);
      expect(body).toContain('12');
    }
  });

  test('singular copy reads correctly for one word', () => {
    for (let seed = 0; seed < 8; seed++) {
      const { body } = buildReminderContent('due-few', { count: 1 }, seed);
      expect(body).not.toContain('1 words');
    }
  });

  test('word kind isolates the Arabic word and falls back without one', () => {
    const withWord = buildReminderContent('word', { count: 2, word: 'كِتاب' }, 0);
    expect(withWord.title).toContain('⁦كِتاب⁩');

    const withoutWord = buildReminderContent('word', { count: 2 }, 0);
    expect(withoutWord.title).toBe(STRINGS.NOTIFICATION_SLIPPING_TITLE_POOL[0]);
  });

  test('every pool entry stays within lock-screen length budgets', () => {
    const sampleWord = isolateRtl('استغفار'); // long-ish word to stress titles

    for (const title of STRINGS.NOTIFICATION_DUE_TITLE_POOL) {
      expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    }
    for (const title of STRINGS.NOTIFICATION_SLIPPING_TITLE_POOL) {
      expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    }
    for (const title of STRINGS.NOTIFICATION_WORD_TITLE_POOL) {
      expect(title(sampleWord).length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    }
    for (const body of STRINGS.NOTIFICATION_DUE_FEW_BODY_POOL) {
      expect(body(5).length).toBeLessThanOrEqual(MAX_BODY_LENGTH);
    }
    for (const body of STRINGS.NOTIFICATION_DUE_MANY_BODY_POOL) {
      expect(body(99).length).toBeLessThanOrEqual(MAX_BODY_LENGTH);
    }
    for (const body of STRINGS.NOTIFICATION_SLIPPING_BODY_POOL) {
      expect(body(99).length).toBeLessThanOrEqual(MAX_BODY_LENGTH);
    }
    for (const body of STRINGS.NOTIFICATION_WORD_BODY_POOL) {
      expect(body(sampleWord, 12).length).toBeLessThanOrEqual(MAX_BODY_LENGTH);
    }
  });

  test('no pool entry uses emoji or exclamation marks', () => {
    const allText: string[] = [
      ...STRINGS.NOTIFICATION_DUE_TITLE_POOL,
      ...STRINGS.NOTIFICATION_SLIPPING_TITLE_POOL,
      ...STRINGS.NOTIFICATION_WORD_TITLE_POOL.map(fn => fn('كلمة')),
      ...STRINGS.NOTIFICATION_DUE_FEW_BODY_POOL.map(fn => fn(3)),
      ...STRINGS.NOTIFICATION_DUE_MANY_BODY_POOL.map(fn => fn(9)),
      ...STRINGS.NOTIFICATION_SLIPPING_BODY_POOL.map(fn => fn(3)),
      ...STRINGS.NOTIFICATION_WORD_BODY_POOL.map(fn => fn('كلمة', 2)),
    ];

    for (const text of allText) {
      expect(text).not.toMatch(/!/);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe('dayOfYearSeed', () => {
  test('consecutive days produce consecutive seeds', () => {
    const seedA = dayOfYearSeed(new Date('2026-07-20T19:00:00'));
    const seedB = dayOfYearSeed(new Date('2026-07-21T19:00:00'));
    expect(seedB).toBe(seedA + 1);
  });
});
