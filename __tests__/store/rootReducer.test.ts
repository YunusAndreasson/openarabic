import { describe, expect, test } from '@jest/globals';

import { accountSwitched } from '@/store/accountActions';
import { rootReducer } from '@/store/rootReducer';
import { setTheme } from '@/store/themeSlice';
import { setDailyWordLimit } from '@/store/settingsSlice';

describe('rootReducer accountSwitched', () => {
  test('resets account-owned slices and keeps the device theme', () => {
    const initial = rootReducer(undefined, { type: '@@init' });
    let state = rootReducer(initial, setDailyWordLimit(3));
    state = rootReducer(state, setTheme(initial.theme.theme === 'dark' ? 'light' : 'dark'));
    expect(state.settings.dailyWordLimit).toBe(3);

    const next = rootReducer(state, accountSwitched());

    expect(next.settings).toEqual(initial.settings);
    expect(next.playlist).toEqual(initial.playlist);
    expect(next.voiceAliases).toEqual(initial.voiceAliases);
    expect(next.theme).toEqual(state.theme);
  });
});
