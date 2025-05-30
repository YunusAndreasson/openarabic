/**
 * Type for filter parameters
 */
export interface FilterParams {
  categoryId?: number;
  authorId?: number;
  difficulty?: number;
  searchQuery?: string;
}

/**
 * Type for review parameters
 */
export interface ReviewParams {
  rootId?: number;
  mode?: 'spaced' | 'random' | 'new';
  count?: number;
  fromVocabulary?: string;
  fromRemember?: string;
}

/**
 * Type for word list parameters
 */
export interface WordListParams {
  filter?: 'all' | 'due' | 'learned';
  sortBy?: 'dueDate' | 'addedDate' | 'difficulty';
  category?: 'total' | 'mastered' | 'learning' | 'due' | 'needsAttention';
}

/**
 * Type for route parameters
 */
export type RouteParams = {
  '/article/[id]': { id: string | number };
  '/filter': FilterParams;
  '/review': ReviewParams;
  '/listen': ListenParams;
  '/wordList': WordListParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/bookmarks': Record<string, never>;
  '/bookmarks': Record<string, never>;
  '/settings': Record<string, never>;
  '/vocabulary': Record<string, never>;
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
 * Type guard to check if a route has parameters
 */
export function hasParams<T extends RoutePath>(
  route: Route<T>
): route is Route<T> & { params: NonNullable<RouteParams[T]> } {
  return route.params !== undefined;
}

/**
 * Type guard to check if a value is a valid route path
 */
export function isRoutePath(path: string): path is RoutePath {
  return Object.keys(routeParams).includes(path);
}

// Route parameter definitions for type checking
const routeParams: Record<RoutePath, true> = {
  '/article/[id]': true,
  '/filter': true,
  '/review': true,
  '/listen': true,
  '/wordList': true,
  '/': true,
  '/(tabs)': true,
  '/(tabs)/bookmarks': true,
  '/bookmarks': true,
  '/settings': true,
  '/vocabulary': true,
};

/**
 * Type for listen parameters
 */
export interface ListenParams {
  fromRemember?: string;
}
