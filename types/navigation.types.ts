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
 * Type for filter parameters with discriminated union
 */
export type FilterParams =
  | {
      type: 'author';
      id: string;
      name?: string;
      headerTitle?: string;
    }
  | {
      type: 'category';
      id: string;
      name?: string;
      headerTitle?: string;
    };

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
 * Type for route parameters - strongly typed for each route
 */
export type RouteParams = {
  '/article/[id]': ArticleParams;
  '/(tabs)/library/filterModal': FiltersParams;
  '/study/review': ReviewParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/study': Record<string, never>;
  '/(tabs)/bookmarks': Record<string, never>;
};

/**
 * Type for route paths - extract all valid route paths
 */
export type RoutePath = keyof RouteParams;

/**
 * Discriminated union for type-safe route navigation
 * Ensures params match the route pathname
 */
export type Route =
  | { pathname: '/article/[id]'; params: ArticleParams }
  | { pathname: '/(tabs)/library/filterModal'; params: FiltersParams }
  | { pathname: '/study/review'; params?: ReviewParams }
  | { pathname: '/'; params?: Record<string, never> }
  | { pathname: '/(tabs)'; params?: Record<string, never> }
  | { pathname: '/(tabs)/study'; params?: Record<string, never> }
  | { pathname: '/(tabs)/bookmarks'; params?: Record<string, never> };

/**
 * Helper type to extract params for a specific route
 */
export type ParamsForRoute<T extends RoutePath> = RouteParams[T];

/**
 * Type guard to check if a route requires params
 */
export type RouteRequiresParams<T extends RoutePath> = RouteParams[T] extends Record<string, never>
  ? false
  : true;
