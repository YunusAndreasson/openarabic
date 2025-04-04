import type { UnknownInputParams } from 'expo-router/build/types';

/**
 * Type for route parameters
 */
export type RouteParams = {
  '/article/[id]': UnknownInputParams & { id: string | number };
  '/filter': UnknownInputParams;
  '/review': UnknownInputParams;
  '/wordList': UnknownInputParams;
  '/': UnknownInputParams;
  '/(tabs)': UnknownInputParams;
  '/(tabs)/bookmarks': UnknownInputParams;
  '/bookmarks': UnknownInputParams;
  '/settings': UnknownInputParams;
  '/vocabulary': UnknownInputParams;
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
