import type { AppTab } from '@/types/enums';

/**
 * Tab icon mapping for consistent icons across the app
 * Uses Ionicons icon names with filled/outline variants
 */
export const TAB_ICONS = {
  LIBRARY: { filled: 'book', outline: 'book-outline' },
  BOOKMARKS: { filled: 'bookmark', outline: 'bookmark-outline' },
  STUDY: { filled: 'school', outline: 'school-outline' },
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
    title: 'Library' as AppTab,
    icon: TAB_ICONS.LIBRARY,
  },
  {
    name: 'bookmarks',
    title: 'Bookmarks' as AppTab,
    icon: TAB_ICONS.BOOKMARKS,
  },
  {
    name: 'study',
    title: 'Study' as AppTab,
    icon: TAB_ICONS.STUDY,
  },
] as const;
