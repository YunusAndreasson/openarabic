/**
 * Branded types for type-safe IDs
 *
 * These types prevent accidentally passing the wrong type of ID to functions.
 * For example, you can't pass an ArticleId where a RootId is expected.
 *
 * @example
 * ```ts
 * function getArticle(id: ArticleId) { ... }
 *
 * const articleId = 123 as ArticleId;
 * const rootId = 456 as RootId;
 *
 * getArticle(articleId); // ✅ Works
 * getArticle(rootId);    // ❌ Type error - prevents bugs!
 * ```
 */

declare const __brand: unique symbol;

type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };

/**
 * Branded type for article IDs
 * Prevents mixing article IDs with other numeric IDs
 */
export type ArticleId = Brand<number, 'ArticleId'>;

/**
 * Branded type for root (vocabulary word) IDs
 * Prevents mixing root IDs with other numeric IDs
 */
export type RootId = Brand<number, 'RootId'>;

/**
 * Branded type for user IDs
 * Prevents mixing user IDs with other string IDs
 */
export type UserId = Brand<string, 'UserId'>;

/**
 * Branded type for category IDs
 * Prevents mixing category IDs with other numeric IDs
 */
export type CategoryId = Brand<number, 'CategoryId'>;

/**
 * Branded type for author IDs
 * Prevents mixing author IDs with other numeric IDs
 */
export type AuthorId = Brand<number, 'AuthorId'>;
