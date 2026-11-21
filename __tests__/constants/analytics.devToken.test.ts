/**
 * Dev builds send nothing to the production Mixpanel project unless asked to:
 * marketer counts every First Open there as a real install.
 */

import { afterEach, describe, expect, jest, test } from '@jest/globals';

const saved = { ...process.env };

const loadToken = (): string | undefined => {
  let token: string | undefined;
  jest.isolateModules(() => {
    token = (require('@/constants/analytics') as typeof import('@/constants/analytics'))
      .MIXPANEL_TOKEN;
  });
  return token;
};

afterEach(() => {
  process.env = { ...saved };
});

describe('MIXPANEL_TOKEN', () => {
  test('is withheld from a dev build', () => {
    expect(__DEV__).toBe(true);
    process.env.EXPO_PUBLIC_MIXPANEL_TOKEN = 'token';
    delete process.env.EXPO_PUBLIC_MIXPANEL_IN_DEV;
    expect(loadToken()).toBeUndefined();
  });

  test('reaches a dev build that opts in', () => {
    process.env.EXPO_PUBLIC_MIXPANEL_TOKEN = 'token';
    process.env.EXPO_PUBLIC_MIXPANEL_IN_DEV = '1';
    expect(loadToken()).toBe('token');
  });
});
