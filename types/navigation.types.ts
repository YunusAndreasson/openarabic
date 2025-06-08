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
  type: 'author' | 'category';
  id: string;
  name?: string;
  headerTitle?: string;
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
  '/(tabs)/read/filter': FilterParams;
  '/practice/review': ReviewParams;
  '/practice/practice': ListenParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/listen': Record<string, never>;
  '/settings': Record<string, never>;
  '/practice': Record<string, never>;
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

// Route parameter definitions for type checking
const _routeParams: Record<RoutePath, true> = {
  '/(tabs)/read/article/[id]': true,
  '/(tabs)/read/filter': true,
  '/practice/review': true,
  '/practice/practice': true,
  '/': true,
  '/(tabs)': true,
  '/(tabs)/listen': true,
  '/settings': true,
  '/practice': true,
};

/**
 * Type for listen parameters
 */
export interface ListenParams {
  fromRemember?: string;
}
