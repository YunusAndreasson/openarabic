import type { AppTab } from '@/types/enums';

/**
 * Tab icon mapping for consistent icons across the app
 * Uses Ionicons icon names
 */
export const TAB_ICONS = {
  LIBRARY: 'book',
  BOOKMARKS: 'bookmark',
  STUDY: 'school',
} as const;

export type TabIconName = (typeof TAB_ICONS)[keyof typeof TAB_ICONS];

/**
 * Tab screen configuration for the main tab navigator
 * Defines the structure and properties of each tab
 */
export interface TabScreenConfig {
  readonly name: 'library' | 'bookmarks' | 'study';
  readonly title: AppTab;
  readonly iconFilled: TabIconName;
}

/**
 * Main tab screens configuration
 * Order determines the display order in the tab bar
 */
export const TAB_SCREENS: readonly TabScreenConfig[] = [
  {
    name: 'library',
    title: 'Library' as AppTab,
    iconFilled: TAB_ICONS.LIBRARY,
  },
  {
    name: 'bookmarks',
    title: 'Bookmarks' as AppTab,
    iconFilled: TAB_ICONS.BOOKMARKS,
  },
  {
    name: 'study',
    title: 'Study' as AppTab,
    iconFilled: TAB_ICONS.STUDY,
  },
] as const;
