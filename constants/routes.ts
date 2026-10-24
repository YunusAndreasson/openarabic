import type { NativeStackNavigationOptions } from 'expo-router';

export const ROUTE_PATHS = {
  AUTH: '/auth',
  AUTH_SIGN_IN: '/auth/sign-in',
  AUTH_SIGN_UP: '/auth/sign-up',
  AUTH_TERMS: '/auth/terms',
  AUTH_PRIVACY: '/auth/privacy',
  TABS: '/(tabs)',
  EXPLORE_TAB: '/(tabs)/explore',
  EXPLORE_SEARCH: '/(tabs)/explore/search',
  PRACTICE_TAB: '/(tabs)/practice',
  PLAYLIST_TAB: '/(tabs)/playlist',
  ACCOUNT: '/(tabs)/account',
  ACCOUNT_HELP: '/(tabs)/account/help',
  ACCOUNT_FONT_SELECTOR: '/(tabs)/account/FontSelector',
  ACCOUNT_DELETE_ACCOUNT: '/(tabs)/account/DeleteAccount',
  ACCOUNT_FEEDBACK: '/(tabs)/account/feedback',
  ACCOUNT_ADVANCED: '/(tabs)/account/advanced',
  TERMS: '/(tabs)/account/terms',
  PRIVACY: '/(tabs)/account/privacy',
  LEGAL: '/(tabs)/account/legal',

  PRACTICE_DICTIONARY: '/(tabs)/practice/dictionary',
  PRACTICE_DUE_WORDS: '/due-words',
  PRACTICE_MEMORY_RETENTION: '/memory-retention',
  PRACTICE_REVIEW_DEPTH: '/review-depth',
  PRACTICE_STUDY_STREAK: '/study-streak',
  PRACTICE_WORDS_TO_REVISIT: '/words-to-revisit',

  /**
   * The word sheet, root-level so it can present over any tab. Distinct from
   * `/(tabs)/practice/word`, which is the full screen inside the practice stack.
   */
  WORD_DETAIL: '/word-detail',

  SLEEP_TIMER: '/sleep-timer',
} as const;

type SheetDetents = NonNullable<NativeStackNavigationOptions['sheetAllowedDetents']>;

/**
 * Every root-level `formSheet` route, by screen name, with its detents.
 *
 * The one list of which routes are sheets. `app/_layout.tsx` declares a
 * `createSheetOptions` screen for each entry, and the root MiniPlayer stands
 * down while one is open (`SHEET_ROUTE_PATHS`). Those used to be two lists kept
 * by hand, and `review-depth` reached the layout but not the MiniPlayer's, so
 * on Android the MiniPlayer drew over the "Reviews done" sheet.
 *
 * See `createSheetOptions` for what `'fitToContents'` requires of a screen.
 */
export const SHEET_ROUTES = {
  'sleep-timer': [0.4],
  // These four fit their contents: fixed-height charts, or a handful of rows,
  // under a short header — no scrolling.
  'due-words': 'fitToContents',
  'memory-retention': 'fitToContents',
  'study-streak': 'fitToContents',
  'review-depth': 'fitToContents',
  // The odd one out: up to 20 leech rows never fit their contents, so this
  // sheet scrolls and needs a fixed detent. Its screen owns the sheet
  // background because the scroll view has to be a direct child — the route
  // file documents the layout react-native-screens requires.
  'words-to-revisit': [0.6, 1],
  // One saved word, root-level so the Explore rail can present it without
  // changing tabs. Fixed detents for the same reason as the sheet above: a
  // memory panel, a stat block and a root explanation do not fit their
  // contents, so this one scrolls and its screen owns the two-child layout
  // that requires.
  'word-detail': [0.6, 1],
} satisfies Readonly<Record<string, SheetDetents>>;

/** The sheets' pathnames, as `usePathname` reports them. */
export const SHEET_ROUTE_PATHS: ReadonlySet<string> = new Set(
  Object.keys(SHEET_ROUTES).map(name => `/${name}`),
);

// Re-export route builders for backward compatibility
export {
  ARTICLE_ROUTE_PREFIX,
  getArticleRoute,
  getCategoryFilterRoute,
  getPracticeReviewRoute,
  getPracticeWordRoute,
  getWordDetailRoute,
} from '@/utils/routeBuilders';
