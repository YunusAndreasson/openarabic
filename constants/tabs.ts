import type { AppTab } from '@/types/enums';

/**
 * SF Symbol configuration for iOS native tabs
 */
interface SFSymbolConfig {
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
}

/**
 * Tab icon mapping for consistent icons across the app
 * Uses Ionicons icon names with filled/outline variants
 * SF Symbols are used for iOS native tabs (liquid glass effect)
 */
export const TAB_ICONS = {
  EXPLORE: {
    filled: 'compass',
    outline: 'compass-outline',
    sf: { default: 'safari', selected: 'safari.fill' },
  },
  PLAYLIST: {
    filled: 'headset',
    outline: 'headset-outline',
    sf: { default: 'hifispeaker', selected: 'hifispeaker.fill' },
  },
  PRACTICE: {
    filled: 'school',
    outline: 'school-outline',
    sf: { default: 'graduationcap', selected: 'graduationcap.fill' },
  },
} as const satisfies Record<string, TabIconDefinition>;

export type TabIconConfig = (typeof TAB_ICONS)[keyof typeof TAB_ICONS];

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
    title: 'Explore' as AppTab,
    icon: TAB_ICONS.EXPLORE,
  },
  {
    name: 'playlist',
    title: 'Playlist' as AppTab,
    icon: TAB_ICONS.PLAYLIST,
  },
  {
    name: 'practice',
    title: 'Practice' as AppTab,
    icon: TAB_ICONS.PRACTICE,
  },
] as const;
