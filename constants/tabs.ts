import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { AppTab } from '@/types/enums';

/**
 * The tab route segments, in `app/(tabs)/`, in the order the tab bar shows them.
 *
 * This list is the source: `TabName` derives from it, and every table below is
 * `satisfies Record<TabName, …>`, so adding a tab here fails the build until it
 * has a title and an icon set. Previously the icon table said
 * `Record<string, …>` and the screen list re-spelled the union inline, so a
 * renamed tab agreed with itself only by luck.
 */
const TAB_ORDER = ['explore', 'playlist', 'practice', 'account'] as const;

type TabName = (typeof TAB_ORDER)[number];

/**
 * Tab icons: each platform's own symbol set, like every icon in the app
 * (constants/icons.ts).
 * - `sf` → SF Symbols, default and selected, for iOS NativeTabs.
 * - `md` → Material Symbols for Android NativeTabs. One name for both states:
 *   NativeTabs draws `md` from the outlined font only and these four symbols
 *   have no `_filled` variant, so the selected tab is marked by the Material
 *   active-indicator pill alone.
 */
interface TabIconDefinition {
  readonly sf: { readonly default: SFSymbol; readonly selected: SFSymbol };
  readonly md: AndroidSymbol;
}

const TAB_ICONS = {
  explore: {
    sf: { default: 'safari', selected: 'safari.fill' },
    md: 'explore',
  },
  playlist: {
    sf: { default: 'headphones', selected: 'headphones' },
    md: 'headphones',
  },
  practice: {
    sf: { default: 'graduationcap', selected: 'graduationcap.fill' },
    md: 'school',
  },
  // Rightmost by convention: settings is where a user looks last, and both
  // platforms park it there (iOS Settings/Music "More", Material's trailing
  // destination). It used to be an avatar in the Explore header, which put the
  // one screen a learner needs least in the corner hardest to reach.
  account: {
    sf: { default: 'gearshape', selected: 'gearshape.fill' },
    md: 'settings',
  },
  // Keyed by the tab's own route segment, not by free string and not by an
  // uppercased variant of it: the key IS the name the screen list looks up, so
  // there is no second spelling to keep in step.
} as const satisfies Record<TabName, TabIconDefinition>;

type TabIconConfig = (typeof TAB_ICONS)[TabName];

/** Header/tab-bar label per tab. */
const TAB_TITLES = {
  explore: AppTab.EXPLORE,
  playlist: AppTab.PLAYLIST,
  practice: AppTab.PRACTICE,
  account: AppTab.ACCOUNT,
} as const satisfies Record<TabName, AppTab>;

/**
 * Tab screen configuration for the main tab navigator
 * Defines the structure and properties of each tab
 */
export interface TabScreenConfig {
  readonly name: TabName;
  readonly title: AppTab;
  readonly icon: TabIconConfig;
}

/**
 * Main tab screens configuration, in `TAB_ORDER`.
 *
 * DERIVED, not hand-listed. Written out, each row paired a name with a title and
 * an icon by hand while `icon` was typed as the UNION of all three icon sets —
 * so `{ name: 'explore', title: 'Explore', icon: TAB_ICONS.PRACTICE }` compiled
 * happily and shipped a graduation cap on the Explore tab. Looking both up by
 * `name` makes that combination unwritable.
 */
export const TAB_SCREENS: readonly TabScreenConfig[] = TAB_ORDER.map(name => ({
  name,
  title: TAB_TITLES[name],
  icon: TAB_ICONS[name],
}));
