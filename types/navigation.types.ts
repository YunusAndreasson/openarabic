/**
 * Type for review parameters
 */
export interface ReviewParams {
  rootId?: number;
  mode?: 'new' | 'random' | 'spaced';
  count?: number;
  fromRemember?: string;
}

/**
 * Type for filter parameters
 */
export interface FilterParams {
  type: 'author' | 'category';
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
 * Type for route parameters
 */
export type RouteParams = {
  '/(tabs)/read/article/[id]': ArticleParams;
  '/(tabs)/read/filterModal': FiltersParams;
  '/practice/review': ReviewParams;
  '/(tabs)/listen/now-playing': NowPlayingModalParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/practice': Record<string, never>;
  '/(tabs)/listen': Record<string, never>;
  '/insights': Record<string, never>;
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
  [key: string]: string | undefined;
}
