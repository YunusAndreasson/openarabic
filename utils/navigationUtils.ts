import { router } from 'expo-router';

import { getArticleRoute, getPracticeReviewRoute } from '@/constants/routes';
import type { ArticleId, RootId } from '@/types/branded.types';

/**
 * Navigation utilities with runtime param validation
 * Prevents crashes from invalid or missing route parameters
 */

/**
 * Validates that a value is defined and not null
 */
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Validates that a number is finite and not NaN
 */
function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Safely navigate to article detail page with ID validation
 * @param id - Article ID to navigate to
 * @param headerTitle - Optional header title
 * @returns true if navigation succeeded, false if validation failed
 */
export function navigateToArticle(id: ArticleId | null | undefined, headerTitle?: string): boolean {
  if (!isDefined(id) || !isValidNumber(id)) {
    return false;
  }

  try {
    const route = getArticleRoute(id, headerTitle);
    router.push(route);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely navigate to study review with optional params
 * @param params - Optional review parameters
 * @returns true if navigation succeeded, false if validation failed
 */
export function navigateToStudyReview(params?: {
  rootId?: RootId;
  mode?: 'new' | 'random' | 'spaced';
  count?: number;
}): boolean {
  try {
    if (params?.rootId && !isValidNumber(params.rootId)) {
      return false;
    }

    const route = getPracticeReviewRoute(params);
    router.push(route);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely navigate back with error handling
 * @returns true if navigation succeeded, false if at root
 */
export function navigateBack(): boolean {
  try {
    if (router.canGoBack()) {
      router.back();
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Safely replace current route with error handling
 * @param href - Route to replace with
 * @returns true if navigation succeeded, false if validation failed
 */
export function navigateReplace(href: string): boolean {
  if (!isDefined(href) || href.trim() === '') {
    return false;
  }

  try {
    router.replace(href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates route parameters before navigation
 * Generic utility for custom validation logic
 */
export function validateAndNavigate<T extends Record<string, unknown>>(
  params: T,
  validator: (p: T) => boolean,
  onValid: () => void,
): boolean {
  if (!validator(params)) {
    return false;
  }

  try {
    onValid();
    return true;
  } catch {
    return false;
  }
}
