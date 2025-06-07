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
 * Type for word list parameters
 */
export interface WordListParams {
  filter?: 'all' | 'due' | 'learned';
  sortBy?: 'addedDate' | 'difficulty' | 'dueDate';
  category?:
    | 'difficultyEasy'
    | 'difficultyHard'
    | 'difficultyMedium'
    | 'due'
    | 'learning'
    | 'mastered'
    | 'needsAttention'
    | 'total';
}

/**
 * Type for route parameters
 */
export type RouteParams = {
  '/article/[id]': { id: number | string };
  '/practice/review': ReviewParams;
  '/practice/practice': ListenParams;
  '/practice/wordList': WordListParams;
  '/practice/wordExamples': Record<string, never>;
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
  '/practice/review': true,
  '/practice/practice': true,
  '/practice/wordList': true,
  '/practice/wordExamples': true,
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
