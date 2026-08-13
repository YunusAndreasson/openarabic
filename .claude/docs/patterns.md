# TypeScript Patterns & Best Practices

## Branded IDs (Type Safety for IDs)

Use branded types to prevent mixing different ID types:

```typescript
// ✅ GOOD - Type-safe IDs
import type { ArticleId, RootId } from '@/types/branded.types';

function getArticle(id: ArticleId): Article {
  /* ... */
}
function getRoot(id: RootId): Root {
  /* ... */
}

// ❌ CAUGHT AT COMPILE TIME
getArticle(rootId); // Error: RootId not assignable to ArticleId
```

**When to cast:** At boundaries where raw IDs enter from external sources:

```typescript
// Route params
const articleId = parseInt(params.id) as ArticleId;

// Service calls
articlesService.getArticleById(id as ArticleId);
```

## Const Objects vs Enums

Prefer const objects over enums for string constants (zero runtime overhead):

```typescript
// ✅ GOOD - Const object (no runtime code)
export const ToastType = {
  ERROR: 'error',
  INFO: 'info',
  SUCCESS: 'success',
} as const;
export type ToastType = (typeof ToastType)[keyof typeof ToastType];

// ❌ AVOID - Enum (generates runtime code, larger bundle)
export enum ToastType {
  ERROR = 'error',
  INFO = 'info',
  SUCCESS = 'success',
}
```

**When to use enums:** Only for numeric enums or bitflags.

## Optional vs Nullable Properties

Be consistent with optionality patterns:

```typescript
// ✅ GOOD - Use ? for truly optional UI props
interface ComponentProps {
  title?: string; // May or may not be provided
  onClick?: () => void; // May or may not exist
}

// ✅ GOOD - Use | null for database fields that can be NULL
interface Article {
  fsrs_due: string | null; // Database can store NULL
  fsrs_stability: number | null; // Database can store NULL
}

// ❌ AVOID - Don't use | undefined explicitly
interface BadProps {
  title: string | undefined; // Just use title?: string
}
```

## Avoiding `any` Types

Never use `any` in production code - always define proper types:

```typescript
// ❌ BAD - Defeats type safety
article.sentences?.forEach((sentence: any) => {
  (sentence as any).words.forEach((word: any) => {
    /* ... */
  });
});

// ✅ GOOD - Proper types
article.article_sentences?.forEach(sentence => {
  sentence.sentence_words?.forEach(word => {
    // word is properly typed as SentenceWord
  });
});
```

## Performance Optimization Patterns

### 1. Don't hand-write memoization

The React Compiler is enabled (`app.json` → `experiments.reactCompiler`, wired
by `babel-preset-expo`). It memoizes values, handlers and JSX automatically, so
`React.memo`, `useMemo` and `useCallback` are redundant in new code — and
manual memoization the compiler cannot validate makes it **bail out of
optimizing that component entirely**, which costs more than it saves. That is
why `BaseCard`, a primitive that runs once per list row, has none.

Existing `memo()` wrappers are being left alone rather than swept; don't add
new ones without a measurement that says the compiler missed.

### 2. Extract Static Constants

```tsx
// Move static styles outside component
const STATIC_STYLES = StyleSheet.create({
  container: {
    padding: LAYOUT.SPACING.MEDIUM,
    margin: LAYOUT.SPACING.SMALL,
  },
});

const MyComponent = () => <View style={STATIC_STYLES.container} />;
```

### 3. Cache per-theme values at module scope, not per component

A value derived from the theme is the same for every component using that
theme, so it belongs in a module-level cache keyed by the theme's colour object
— not in a hook that recomputes it once per instance. `getElevation`
(`constants/elevation.ts`) and `BaseCard`'s surface cache are the reference
implementations; both hand back an identity-stable object, so a list of fifty
rows shares one.

### 4. Only subscribe to the theme once

`useColors()` and `useIsDarkMode()` are each a `use(ReactReduxContext)` plus a
`useColorScheme()` plus a store subscription. Calling both — or calling
`useColors()` in a component whose hook also calls it — multiplies that per
instance. Derive what you need from a single `useColors()` result.

## ESLint Rules

- **Import/Export**: Use `import type` for type-only imports: `import type { User } from './types'`
- **Variable Rules**: No unused variables (prefix with `_` if intentionally unused: `_unusedParam`)
- **React Rules**: Follow React Hooks rules strictly, always provide `key` prop for list items
- **Code Quality**: Use types from `/types` directory, never use `any` type

## Prettier Configuration

- **Semi-colons**: Always required
- **Quotes**: Single quotes for strings, double for JSX attributes
- **Trailing commas**: Always add for multi-line structures
- **Tab width**: 2 spaces
- **Print width**: 100 characters

**CRITICAL**: Always use `yarn prettier:fix` when prettier check fails. Never manually fix formatting.
