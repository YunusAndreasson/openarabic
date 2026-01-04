# TypeScript Patterns & Best Practices

## Branded IDs (Type Safety for IDs)

Use branded types to prevent mixing different ID types:

```typescript
// ✅ GOOD - Type-safe IDs
import type { ArticleId, RootId } from '@/types/branded.types';

function getArticle(id: ArticleId): Article { /* ... */ }
function getRoot(id: RootId): Root { /* ... */ }

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
  title?: string;       // May or may not be provided
  onClick?: () => void; // May or may not exist
}

// ✅ GOOD - Use | null for database fields that can be NULL
interface Article {
  fsrs_due: string | null;       // Database can store NULL
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
  (sentence as any).words.forEach((word: any) => { /* ... */ });
});

// ✅ GOOD - Proper types
article.article_sentences?.forEach(sentence => {
  sentence.sentence_words?.forEach(word => {
    // word is properly typed as SentenceWord
  });
});
```

## Performance Optimization Patterns

### 1. React.memo for Component Memoization

```tsx
const ExpensiveComponent = React.memo(({ data }: { data: string[] }) => {
  return <ComplexChart data={data} />;
});
```

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

### 3. useMemo for Expensive Calculations

```tsx
const processedData = useMemo(
  () => items.map(item => expensiveProcessing(item)).filter(Boolean),
  [items],
);
```

### 4. useCallback for Event Handlers

```tsx
const handlePress = useCallback(() => {
  onPress();
}, [onPress]);
```

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
