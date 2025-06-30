/**
 * Type for review parameters
 */
export interface ReviewParams {
  rootId?: number;
  mode?: 'new' | 'random' | 'spaced';
  count?: number;
  fromVocabulary?: string;
  fromRemember?: string;
}

/**
 * Type for filter parameters
 */
export interface FilterParams {
  type: 'author' | 'category' | 'bookmark';
  id: string;
  name?: string;
  headerTitle?: string;
}

/**
 * Type for filters modal parameters
 */
export interface FiltersParams {
  categoryId: string;
}

/**
 * Type for article parameters
 */
export interface ArticleParams {
  id: string;
  headerTitle?: string;
}

/**
 * Type for insights info screen parameters
 */
export interface InsightsInfoParams {
  type: string;
}

/**
 * Type for route parameters
 */
export type RouteParams = {
  '/(tabs)/read/article/[id]': ArticleParams;
  '/(tabs)/read/filter': FilterParams;
  '/(tabs)/read/filterModal': FiltersParams;
  '/practice/review': ReviewParams;
  '/practice/audio': ListenParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/practice': Record<string, never>;
  '/(tabs)/listen': Record<string, never>;
  '/settings': Record<string, never>;
  '/insights': Record<string, never>;
  '/insights/info/[type]': InsightsInfoParams;
};

/**
 * Type for route paths
 */
export type RoutePath = keyof RouteParams;

/**
 * Type for route objects
 */
export type Route<T extends RoutePath> = {
  pathname: T;
  params?: RouteParams[T];
};

/**
 * Type for listen parameters
 */
export interface ListenParams {
  fromRemember?: string;
}

/**
 * Parameters that can be passed to the NowPlaying modal
 */
export interface NowPlayingModalParams {
  articleId?: string;
  position?: string;
  duration?: string;
  audioState?: string;
  [key: string]: string | undefined;
}
