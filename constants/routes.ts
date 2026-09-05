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

// Re-export route builders for backward compatibility
export {
  ARTICLE_ROUTE_PREFIX,
  getArticleRoute,
  getCategoryFilterRoute,
  getPracticeReviewRoute,
  getPracticeWordRoute,
  getWordDetailRoute,
} from '@/utils/routeBuilders';
