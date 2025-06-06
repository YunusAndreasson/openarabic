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
  category?:
    | 'total'
    | 'mastered'
    | 'learning'
    | 'due'
    | 'needsAttention'
    | 'difficultyEasy'
    | 'difficultyMedium'
    | 'difficultyHard';
}

/**
 * Type for route parameters
 */
export type RouteParams = {
  '/article/[id]': { id: string | number };
  '/review': ReviewParams;
  '/practice': ListenParams;
  '/wordList': WordListParams;
  '/': Record<string, never>;
  '/(tabs)': Record<string, never>;
  '/(tabs)/listen': Record<string, never>;
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
  '/review': true,
  '/practice': true,
  '/wordList': true,
  '/': true,
  '/(tabs)': true,
  '/(tabs)/listen': true,
  '/settings': true,
  '/vocabulary': true,
};

/**
 * Type for listen parameters
 */
export interface ListenParams {
  fromRemember?: string;
}
