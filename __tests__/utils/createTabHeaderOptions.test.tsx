/**
 * The tab header's action slots differ by platform, and the difference is easy
 * to lose in a refactor because it is invisible on whichever platform you are
 * looking at.
 *
 * iOS puts the tab's tools leading. Android cannot: a Material top app bar
 * reserves its leading slot for navigation, so an icon button placed there
 * renders flush against the title and reads as an ornament on the word rather
 * than a control. On Android the tools move trailing, inboard of the primary
 * action so `Review` / `Play all` keep their position.
 */

import { describe, expect, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { createTabHeaderOptions } from '@/utils/navigation/createTabHeaderOptions';

const Tools = () => <ThemedText>tools</ThemedText>;
const Primary = () => <ThemedText>primary</ThemedText>;

const originalPlatform = Platform.OS;

afterEach(() => {
  Platform.OS = originalPlatform;
});

describe('createTabHeaderOptions', () => {
  test('iOS keeps the tools leading and the primary action trailing', () => {
    Platform.OS = 'ios';

    const options = createTabHeaderOptions({
      title: 'Playlist',
      leftComponent: Tools,
      rightComponent: Primary,
    });

    expect(options.headerLeft).toBe(Tools);
    expect(options.headerRight).toBe(Primary);
  });

  test('Android leaves the leading slot to navigation and moves the tools trailing', () => {
    Platform.OS = 'android';

    const options = createTabHeaderOptions({
      title: 'Playlist',
      leftComponent: Tools,
      rightComponent: Primary,
    });

    expect(options.headerLeft).toBeUndefined();
    expect(options.headerRight).toBeDefined();

    // Both actions render, tools first so the primary action stays outermost.
    const HeaderRight = options.headerRight as () => React.ReactElement;
    const { getByText } = render(<HeaderRight />);
    expect(getByText('tools')).toBeTruthy();
    expect(getByText('primary')).toBeTruthy();
  });

  test('Android passes a lone primary action straight through', () => {
    Platform.OS = 'android';

    const options = createTabHeaderOptions({ title: 'Explore', rightComponent: Primary });

    expect(options.headerLeft).toBeUndefined();
    // No tools to group with, so no wrapper is introduced.
    expect(options.headerRight).toBe(Primary);
  });

  test('the iOS large title is opt-in per platform', () => {
    Platform.OS = 'android';
    expect(createTabHeaderOptions({ title: 'Explore' }).headerLargeTitle).toBe(false);

    Platform.OS = 'ios';
    expect(createTabHeaderOptions({ title: 'Explore' }).headerLargeTitle).toBe(true);
  });
});
