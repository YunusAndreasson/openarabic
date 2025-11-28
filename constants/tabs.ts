import type { AppTab } from '@/types/enums';

/**
 * Tab icon mapping for consistent icons across the app
 * Uses Ionicons icon names with filled/outline variants
 */
export const TAB_ICONS = {
  EXPLORE: { filled: 'compass', outline: 'compass-outline' },
  PLAYLIST: { filled: 'headset', outline: 'headset-outline' },
  PRACTICE: { filled: 'school', outline: 'school-outline' },
} as const;

export type TabIconConfig = (typeof TAB_ICONS)[keyof typeof TAB_ICONS];

/**
 * Tab screen configuration for the main tab navigator
 * Defines the structure and properties of each tab
 */
export interface TabScreenConfig {
  readonly name: 'library' | 'bookmarks' | 'study';
  readonly title: AppTab;
  readonly icon: TabIconConfig;
}

/**
 * Main tab screens configuration
 * Order determines the display order in the tab bar
 */
export const TAB_SCREENS: readonly TabScreenConfig[] = [
  {
    name: 'library',
    title: 'Explore' as AppTab,
    icon: TAB_ICONS.EXPLORE,
  },
  {
    name: 'bookmarks',
    title: 'Playlist' as AppTab,
    icon: TAB_ICONS.PLAYLIST,
  },
  {
    name: 'study',
    title: 'Practice' as AppTab,
    icon: TAB_ICONS.PRACTICE,
  },
] as const;
