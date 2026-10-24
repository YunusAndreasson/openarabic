import { describe, expect, test } from '@jest/globals';

import { parsePositiveIntParam } from '@/utils/routeParams';

describe('parsePositiveIntParam', () => {
  test('reads a string of digits as the id it spells', () => {
    expect(parsePositiveIntParam('12')).toBe(12);
    expect(parsePositiveIntParam('007')).toBe(7);
  });

  // Each of these used to open some other id, or none, with no sign the link
  // itself was malformed: parseInt('12abc') is 12, Number('') is 0, Number('1e3')
  // is 1000.
  test.each([['12abc'], [''], [' 12'], ['1e3'], ['12.5'], ['-3'], ['0'], ['9007199254740993']])(
    'rejects %p',
    raw => {
      expect(parsePositiveIntParam(raw)).toBeUndefined();
    },
  );

  test('rejects a missing param and a repeated one', () => {
    expect(parsePositiveIntParam(undefined)).toBeUndefined();
    expect(parsePositiveIntParam(['1', '2'])).toBeUndefined();
  });
});
