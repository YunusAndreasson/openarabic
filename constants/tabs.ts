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
const TAB_ORDER = ['explore', 'playlist', 'practice'] as const;

type TabName = (typeof TAB_ORDER)[number];

/**
 * SF Symbol configuration for iOS native tabs
 */
interface SFSymbolConfig {
  readonly default: string;
  readonly selected: string;
}

/**
 * Ionicons name pair used for the Android NativeTabs `src` slot
 * (rendered through NativeTabs.Trigger.VectorIcon)
 */
interface IoniconsConfig {
  readonly default: string;
  readonly selected: string;
}

/**
 * Tab icon configuration with Ionicons and SF Symbols
 */
interface TabIconDefinition {
  readonly filled: string;
  readonly outline: string;
  readonly sf: SFSymbolConfig;
  readonly ion: IoniconsConfig;
}

/**
 * Tab icon mapping for consistent icons across the app
 * - `sf`  → SF Symbols, used by iOS NativeTabs (liquid glass)
 * - `ion` → Ionicons, used by Android NativeTabs via VectorIcon
 * - `filled`/`outline` → kept for any non-tab Ionicons usage in the app
 */
const TAB_ICONS = {
  explore: {
    filled: 'compass',
    outline: 'compass-outline',
    sf: { default: 'safari', selected: 'safari.fill' },
    ion: { default: 'compass-outline', selected: 'compass' },
  },
  playlist: {
    filled: 'headset',
    outline: 'headset-outline',
    sf: { default: 'headphones', selected: 'headphones' },
    ion: { default: 'headset-outline', selected: 'headset' },
  },
  practice: {
    filled: 'school',
    outline: 'school-outline',
    sf: { default: 'graduationcap', selected: 'graduationcap.fill' },
    ion: { default: 'school-outline', selected: 'school' },
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
