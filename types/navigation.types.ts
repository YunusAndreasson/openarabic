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
  '/(tabs)/read/article/[id]': true,
  '/(tabs)/read/filter': true,
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
