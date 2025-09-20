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
  '/article/[id]': ArticleParams;
  '/(tabs)/library/filterModal': FiltersParams;
  '/study/review': ReviewParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/study': Record<string, never>;
  '/(tabs)/bookmarks': Record<string, never>;
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
