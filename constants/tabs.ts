import type { AppTab } from '@/types/enums';

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
  EXPLORE: {
    filled: 'compass',
    outline: 'compass-outline',
    sf: { default: 'safari', selected: 'safari.fill' },
    ion: { default: 'compass-outline', selected: 'compass' },
  },
  PLAYLIST: {
    filled: 'headset',
    outline: 'headset-outline',
    sf: { default: 'headphones', selected: 'headphones' },
    ion: { default: 'headset-outline', selected: 'headset' },
  },
  PRACTICE: {
    filled: 'school',
    outline: 'school-outline',
    sf: { default: 'graduationcap', selected: 'graduationcap.fill' },
    ion: { default: 'school-outline', selected: 'school' },
  },
} as const satisfies Record<string, TabIconDefinition>;

type TabIconConfig = (typeof TAB_ICONS)[keyof typeof TAB_ICONS];

/**
 * Tab screen configuration for the main tab navigator
 * Defines the structure and properties of each tab
 */
export interface TabScreenConfig {
  readonly name: 'explore' | 'playlist' | 'practice';
  readonly title: AppTab;
  readonly icon: TabIconConfig;
}

/**
 * Main tab screens configuration
 * Order determines the display order in the tab bar
 */
export const TAB_SCREENS: readonly TabScreenConfig[] = [
  {
    name: 'explore',
    title: 'Explore',
    icon: TAB_ICONS.EXPLORE,
  },
  {
    name: 'playlist',
    title: 'Playlist',
    icon: TAB_ICONS.PLAYLIST,
  },
  {
    name: 'practice',
    title: 'Practice',
    icon: TAB_ICONS.PRACTICE,
  },
] as const;
