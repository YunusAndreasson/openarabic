/**
 * Branded-ID constructors for tests.
 *
 * `types/branded.types.ts` brands the ID primitives so an `ArticleId` cannot be
 * passed where a `RootId` is wanted. Production code never needs a constructor —
 * branded IDs enter the app already branded, from the database layer — so
 * exporting one from `types/` would weaken the brand everywhere. Tests do need
 * one, because a fixture starts life as a literal.
 *
 * Use these instead of scattering `as RootId` casts: the cast is written once,
 * here, where it is obviously safe.
 */
import type { ArticleId, AuthorId, CategoryId, RootId, UserId } from '@/types/branded.types';

export const rootId = (value: number): RootId => value as RootId;
export const articleId = (value: number): ArticleId => value as ArticleId;
export const categoryId = (value: number): CategoryId => value as CategoryId;
export const authorId = (value: number): AuthorId => value as AuthorId;
export const userId = (value: string): UserId => value as UserId;
