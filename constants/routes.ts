export const ROUTE_PATHS = {
  AUTH: '/auth',
  AUTH_SIGN_IN: '/auth/sign-in',
  AUTH_SIGN_UP: '/auth/sign-up',
  AUTH_TERMS: '/auth/terms',
  AUTH_PRIVACY: '/auth/privacy',
  TABS: '/(tabs)',
  EXPLORE_TAB: '/(tabs)/explore',
  PRACTICE_TAB: '/(tabs)/practice',
  PLAYLIST_TAB: '/(tabs)/playlist',
  ACCOUNT: '/(tabs)/explore/account',
  ACCOUNT_HELP: '/(tabs)/explore/account/help',
  ACCOUNT_FONT_SELECTOR: '/(tabs)/explore/account/FontSelector',
  ACCOUNT_DELETE_ACCOUNT: '/(tabs)/explore/account/DeleteAccount',
  ACCOUNT_FEEDBACK: '/(tabs)/explore/account/feedback',
  TERMS: '/(tabs)/explore/account/terms',
  PRIVACY: '/(tabs)/explore/account/privacy',
  LEGAL: '/(tabs)/explore/account/legal',

  PRACTICE_REVIEW: '/review',
  PRACTICE_DICTIONARY: '/(tabs)/practice/dictionary',
} as const;

// Re-export route builders for backward compatibility
export {
  getArticleRoute,
  getCategoryFilterRoute,
  getPracticeReviewRoute,
} from '@/utils/routeBuilders';
